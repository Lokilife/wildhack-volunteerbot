import { Telegraf } from 'telegraf'
import { dockStart } from '@nlpjs/basic'

async function getAnswer(question: string) {
    const dock = await dockStart({ use: ['Basic']})
    const nlp = dock.get('nlp')
    await nlp.addCorpus('./corpus-ru.json')
    await nlp.train()
    const response = await nlp.process('ru', question)
    return response
}

const bot = new Telegraf('5080406069:AAF5UH5TskSDZcxURFHG96U2tK75vmeh32M')
bot.start((ctx) => {   
    ctx.reply("Hello, World!")
})

function randomChoice<T>(array: Array<T>): T {
    return array[Math.floor(Math.random() * (array.length-1))]
}

bot.on('text', async (ctx) => {
    const answers = ((await getAnswer(ctx.message.text)).answers as Array<any>)
    
    const answerObject = randomChoice(answers)

    if (!answerObject)
        return ctx.reply('Увы, я не знаю ответа на ваш вопрос, попробуйте перефразировать, или обратитесь к ответственному за волонтёрство Кроноцкого заповедника.')
    
    const answer = answerObject.answer
    
    ctx.reply(answer)
})

bot.launch()
