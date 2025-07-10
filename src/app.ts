import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createBot, createProvider, createFlow, addKeyword, utils, EVENTS } from '@builderbot/bot'
//import { MemoryDB as Database } from '@builderbot/bot'
import { MetaProvider as Provider } from '@builderbot/provider-meta'
import { MongoAdapter as Database } from '@builderbot/database-mongo'
/* const MONGO_DB_URI = 'mongodb://0.0.0.0:27017';
const MONGO_DB_NAME = 'db_bot'; */
import 'dotenv/config'
import { readFileSync } from 'fs'

import chat from './chatGPT.js'
import { handlerAI } from './myWhisper.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT ?? 3008

const menuFromFile = readFileSync(join(__dirname, '../mensajes/menu.txt'), 'utf-8')
const menuPrincipalFromFile = readFileSync(join(__dirname, '../mensajes/menuPrincipal.txt'), 'utf-8')
const federicoGreetFromFile = readFileSync(join(__dirname, '../mensajes/federicoGreet.txt'), 'utf-8')
//const menu = "Este es el menu de opciones:\n1 = Menu 1\n2 = Menu 2\n3 = Menu 3\n4 = Menu 4\n5 = Menu 5\n0 = Salir";
const bievenidaFlow = addKeyword<Provider, Database>(EVENTS.WELCOME)
    .addAnswer(federicoGreetFromFile)
    .addAction(async (ctx, { gotoFlow }) => {
        return gotoFlow(menuPrincipalFlow);
    });

const testflow = addKeyword(EVENTS.ACTION)
                .addAnswer("testflow");

const voiceNoteFlow = addKeyword(EVENTS.VOICE_NOTE).addAnswer('Give me a second to hear you!',
    null,
    async (ctx, { gotoFlow, fallBack, flowDynamic }) => {
        console.log("ctx audio =>",ctx)
        try {
            const text = await handlerAI(ctx);
            console.log("text=>",text)
            if (text && text !== "Error processing voice message") {
                await flowDynamic(`I heard: "${text}"`);
            } else {
                await flowDynamic("Sorry, I couldn't process your voice message. Please try again.");
            }
        } catch (error) {
            console.error("Error processing voice:", error);
            await flowDynamic("Sorry, there was an error processing your voice message.");
        } 
    }
);

const menuPrincipalFlow = addKeyword(EVENTS.ACTION)    
    .addAnswer(
        menuPrincipalFromFile,
    { capture: true },
    async (ctx, { gotoFlow, fallBack, flowDynamic }) => {
        console.log("llego2 ctx=>",ctx)
        //console.log("menuPrincipalFromFile=>",menuPrincipalFromFile);
        if (!["R", "M", "P", "S"].includes(ctx.body)) {
            console.log("fallBack ")
            return fallBack(
                "Respuesta no válida, por favor selecciona una de las opciones."
            );
        }
        console.log("switch=>",ctx.body)
        switch (ctx.body) {
            case "R":
                return await flowDynamic("reservarMesa");
            case "M":
                return gotoFlow(menuFlow);
                //return await flowDynamic("menuFlow");
            case "P":
                return await flowDynamic("pagar");
            case "S":                
                return await flowDynamic(
                    "Saliendo... Puedes volver a acceder a este menú escribiendo 'Hola'"
                );
        }
    }
);

const reservarMesa = addKeyword(EVENTS.ACTION).addAnswer('reservarMesa');
const mostrarMenu = addKeyword(EVENTS.ACTION).addAnswer('mostrarMenu');
const pagar = addKeyword(EVENTS.ACTION).addAnswer('pagar');

const menuFlow = addKeyword('Menu')
    .addAnswer(
        menuFromFile,
    { capture: true },
    async (ctx, { gotoFlow, fallBack, flowDynamic }) => {
        if (!["1", "2", "3", "4", "5", "0"].includes(ctx.body)) {
            return fallBack(
                "Respuesta no válida2, por favor selecciona una de las opciones."
            );
        }
        switch (ctx.body) {
            case "1":
                return gotoFlow(menu1);
            case "2":
                return gotoFlow(menu2);
            case "3":
                return gotoFlow(menu3);
            case "4":
                return await flowDynamic("menu4");
            case "5":
                return await flowDynamic("menu5");
            case "0":
                /* return await flowDynamic(
                    "Saliendo... Puedes volver a acceder a este menú escribiendo 'Menu'"
                );  */
                await flowDynamic('Volviendo al menu principal')
                return gotoFlow(menuPrincipalFlow);
        }
    }
);

const menu1 = addKeyword(EVENTS.ACTION)
                .addAnswer('menu11 - PDF Document',
                    {media: 'https://www.ujamaaresort.org/wp-content/uploads/2018/01/Ujamaa-restaurant-menu.pdf?utm_source=chatgpt.com'},
                    async (ctx, { gotoFlow, fallBack, flowDynamic }) => {
                        await flowDynamic('When you are ready choose the correct option');
                        return gotoFlow(menuPrincipalFlow);
                    }
                );
const menu2 = addKeyword(EVENTS.ACTION).addAnswer('menu2 - Image ',
    {media: 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png'}
);
const menu3 = addKeyword(EVENTS.ACTION).addAnswer('menu3 - Consultar a CHATGPT',
    {capture: true},
    async (ctx, { gotoFlow, fallBack, flowDynamic }) => {
        if(ctx.body.toLowerCase() === 'v'){
            //await flowDynamic('When you are ready choose the correct option');
             return gotoFlow(menuPrincipalFlow);
        }
        const prompt = "Eres un asistente de restaurante, que te encarga de responder preguntas sobre el menu del restaurante. El menu es el siguiente: " + menuFromFile;
        const userMessage = ctx.body;
        console.log("userMessage=>",userMessage)
        const response = await chat(prompt, userMessage);
        console.log("response=>", response.content);
        await flowDynamic(response.content);
        await flowDynamic("Para regresar al menu principal, escribe 'V'");
        // Don't return to main menu - stay in this flow for continued conversation       

    }
);

const menu4 = addKeyword(EVENTS.ACTION).addAnswer('menu4');
const menu5 = addKeyword(EVENTS.ACTION).addAnswer('menu5'); 


// Example flows for all BuilderBot EVENTS
const welcomeFlow = addKeyword("Lucho")
    .addAnswer("Send my answer",
        {delay: 1000},
    async ( ctx, ctxfn) => {
         console.log("ctx=>",ctx)
         console.log("ctxfn=>",ctxfn)
         if(ctx.body.includes('hey')){
            ctxfn.flowDynamic('linked Function ' + ctx.body)
         }else{
            ctxfn.flowDynamic('Your text is not include hey')
         }        
    });
const mediaFlow = addKeyword(EVENTS.MEDIA).addAnswer('I received a media image/video')
const documentFlow = addKeyword(EVENTS.DOCUMENT).addAnswer("I can't read this document right now")
const locationFlow = addKeyword(EVENTS.LOCATION).addAnswer("I have received your location!")
//const voiceNoteFlow2 = addKeyword(EVENTS.VOICE_NOTE).addAnswer('Give me a second to hear you!')


const main = async () => {
    const adapterFlow = createFlow([
        bievenidaFlow,
        menuPrincipalFlow,
        mediaFlow,
        documentFlow,
        locationFlow,
        voiceNoteFlow,
        //voiceNoteFlow2,
        menuFlow,
        menu1,
        menu2,
        menu3,
        menu4,
        menu5
    ])
    const adapterProvider = createProvider(Provider, {
        jwtToken: process.env.JWT_TOKEN, 
        numberId: process.env.NUMBER_ID,
        verifyToken: process.env.VERIFY_TOKEN,
        version: process.env.VERSION
    })
    //const adapterDB = new Database();
    const adapterDB = new Database({
        dbUri: process.env.MONGO_DB_URI,
        dbName: process.env.MONGO_DB_NAME,
    })

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    // Add a GET endpoint to show the bot is running
    adapterProvider.server.get('/', (req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        res.end(`
            <html>
                <head><title>WhatsApp Bot</title></head>
                <body>
                    <h1>WhatsApp Bot is Running!</h1>
                    <p>Server is active on port ${PORT}</p>
                    <h2>Available endpoints:</h2>
                    <ul>
                        <li><strong>POST</strong> /v1/messages - Send a message</li>
                        <li><strong>POST</strong> /v1/register - Trigger registration flow</li>
                        <li><strong>POST</strong> /v1/samples - Trigger samples flow</li>
                        <li><strong>POST</strong> /v1/blacklist - Manage blacklist</li>
                    </ul>
                </body>
            </html>
        `)
    })

    adapterProvider.server.post(
        '/v1/messages',
        handleCtx(async (bot, req, res) => {
            const { number, message, urlMedia } = req.body
            await bot.sendMessage(number, message, { media: urlMedia ?? null })
            return res.end('sended')
        })
    )

    adapterProvider.server.post(
        '/v1/register',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('REGISTER_FLOW', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/samples',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('SAMPLES', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/blacklist',
        handleCtx(async (bot, req, res) => {
            const { number, intent } = req.body
            if (intent === 'remove') bot.blacklist.remove(number)
            if (intent === 'add') bot.blacklist.add(number)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', number, intent }))
        })
    )

    httpServer(+PORT)
}

main()
