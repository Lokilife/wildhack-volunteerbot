import { Telegraf } from 'telegraf'
import { dockStart } from '@nlpjs/basic'
import { token } from '../config.json'
import vosk from 'vosk'
import { execSync } from 'child_process'
import https from 'https'
import fs from 'fs'
import { Readable } from 'stream'
import wav from 'wav'
// Разбираемся с Vosk

const MODEL_PATH = "model"

if (!fs.existsSync(MODEL_PATH)) {
    console.log("Please download the model from https://alphacephei.com/vosk/models and unpack as " + MODEL_PATH + " in the current folder.")
    process.exit()
}

vosk.setLogLevel(0);
const model = new vosk.Model(MODEL_PATH);

// wfReader.on('format', async ({ audioFormat, sampleRate, channels }) => {
//     const rec = new vosk.Recognizer({model: model, sampleRate: sampleRate});
//     rec.setMaxAlternatives(10);
//     rec.setWords(true);
//     for await (const data of wfReadable) {
//         const end_of_speech = rec.acceptWaveform(data);
//         if (end_of_speech) {
//             console.log(JSON.stringify(rec.result(), null, 4));
//         }
//     }
//     console.log(JSON.stringify(rec.finalResult(rec), null, 4));
//     //rec.free();
// });

// Запускаем нейронку и скармливаем список фраз
const dock = await dockStart({ use: ['Basic']})
const nlp = dock.get('nlp')
await nlp.addCorpus('./corpus-ru.json')
await nlp.train()

// Даже не пытайтесь использовать этот токен
const bot = new Telegraf(token)
bot.start((ctx) => {
    ctx.reply("Приветствую. Я бот-помошник что ответит на ваши вопросы по поводу волонтёрства в Кроноцком заповеднике. Задавайте ваши вопросы!")
})

function randomChoice<T>(array: Array<T>): T {
    return array[Math.floor(Math.random() * (array.length-1))]
}

bot.on('text', async (ctx) => {
    await handleMessage(ctx, ctx.message.text);
});

async function handleMessage(ctx, text) {
    const answer = randomChoice((await nlp.process('ru', text)).answers as Array<any>)
                   ?.answer

    if (!answer)
        ctx.reply('Увы, я не знаю ответа на ваш вопрос, попробуйте перефразировать, или обратитесь к ответственному за волонтёрство Кроноцкого заповедника.')
    else {
        ctx.reply(answer)
    }
}

bot.on('voice', async (ctx) => {
    try {
        ctx.telegram.getFileLink(ctx.message.voice.file_id).then( async (url) => {    
            let file_name = ctx.message.voice.file_id + ".ogg";
            let file = fs.createWriteStream(file_name);
            let request = https.get(url, (response) => {
                response.pipe(file);
            });
            await sleep(500);
            execSync(`opusdec ${file_name} ./${file_name.replace("ogg", "wav")}`);
            fs.unlink(file_name, (err) => {

            });
            file_name = file_name.replace("ogg", "wav");
            const wfReader = new wav.Reader();
            const wfReadable = new Readable().wrap(wfReader);

            wfReader.on('format', async ({ audioFormat, sampleRate, channels }) => {
                const rec = new vosk.Recognizer({model: model, sampleRate: sampleRate});
                rec.setMaxAlternatives(10);
                rec.setWords(true);
                for await (const data of wfReadable) {
                    const end_of_speech = rec.acceptWaveform(data);
                }
                let result = rec.finalResult(rec);
                rec.free();
                
                handleMessage(ctx, result['alternatives'][0]['text'])
            });
            
            fs.createReadStream(file_name, {'highWaterMark': 4096}).pipe(wfReader);
            fs.unlink(file_name, (err) => {

            });
            
        });
    } catch {

    }
})

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

bot.launch()
