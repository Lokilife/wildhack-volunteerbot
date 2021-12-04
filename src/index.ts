import { Telegraf } from 'telegraf'
import { dockStart } from '@nlpjs/basic'
import { token } from '../config.json'

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
    const answer = randomChoice((await nlp.process('ru', ctx.message.text)).answers as Array<any>)
                   ?.answer

    if (!answer)
        return ctx.reply('Увы, я не знаю ответа на ваш вопрос, попробуйте перефразировать, или обратитесь к ответственному за волонтёрство Кроноцкого заповедника.')
    
    ctx.reply(answer)
})

bot.launch()
