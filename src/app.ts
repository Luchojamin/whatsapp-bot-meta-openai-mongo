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
import fs from 'fs';
import fetch from 'node-fetch';
import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';

import chat from './chatGPT.js'
import { handlerAI } from './myWhisper.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT ?? 3008

// MongoDB GridFS setup
let gridFSBucket: GridFSBucket;

const initializeGridFS = async () => {
    const client = new MongoClient(process.env.MONGO_DB_URI!);
    await client.connect();
    const db = client.db(process.env.MONGO_DB_NAME);
    gridFSBucket = new GridFSBucket(db);
    console.log('GridFS initialized');
};

// Function to store media in MongoDB GridFS
const storeMediaInGridFS = async (buffer: Buffer, filename: string, metadata: any) => {
    const uploadStream = gridFSBucket.openUploadStream(filename, {
        metadata: {
            ...metadata,
            uploadDate: new Date()
        }
    });
    
    uploadStream.end(buffer);
    
    return new Promise((resolve, reject) => {
        uploadStream.on('finish', () => {
            resolve(uploadStream.id);
        });
        uploadStream.on('error', reject);
    });
};

// Function to retrieve media from GridFS
const getMediaFromGridFS = async (fileId: string) => {
    const downloadStream = gridFSBucket.openDownloadStream(new ObjectId(fileId));
    const chunks: Buffer[] = [];
    
    return new Promise<Buffer>((resolve, reject) => {
        downloadStream.on('data', (chunk) => chunks.push(chunk));
        downloadStream.on('end', () => resolve(Buffer.concat(chunks)));
        downloadStream.on('error', reject);
    });
};

// Helper function to determine media type from MIME type
const getMediaTypeFromMime = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('application/')) return 'document';
    return 'unknown';
};

// Helper function to determine if media should be backed up
const shouldBackupMedia = (mediaType: string): boolean => {
    // Always backup voice notes (important for conversation history)
    if (mediaType === 'audio') return true;
    
    // Backup documents (business critical)
    if (mediaType === 'document') return true;
    
    // Don't backup images/videos by default (can be changed later)
    if (mediaType === 'image' || mediaType === 'video') return false;
    
    return false;
};

// Function to store media metadata in MongoDB
const storeMediaMetadata = async (mediaData: any) => {
    const client = new MongoClient(process.env.MONGO_DB_URI!);
    await client.connect();
    const db = client.db(process.env.MONGO_DB_NAME);
    const collection = db.collection('media_references');
    
    const mediaReference = {
        mediaId: mediaData.mediaId,
        mimeType: mediaData.mimeType,
        size: mediaData.size,
        from: mediaData.from,
        messageId: mediaData.messageId,
        originalUrl: mediaData.originalUrl,
        type: mediaData.type,
        timestamp: new Date(),
        // Optional fields
        transcription: mediaData.transcription || null,
        thumbnailUrl: mediaData.thumbnailUrl || null,
        metadata: {
            width: mediaData.width || null,
            height: mediaData.height || null,
            duration: mediaData.duration || null,
            language: mediaData.language || null,
            filename: mediaData.filename || null
        },
        // Backup flags
        needsBackup: mediaData.needsBackup || false,
        backupStatus: mediaData.backupStatus || 'pending',
        backupDate: mediaData.backupDate || null
    };
    
    const result = await collection.insertOne(mediaReference);
    console.log(`Media metadata stored with ID: ${result.insertedId}`);
    return result.insertedId;
};

// Function to get media metadata by user
const getMediaMetadataByUser = async (phoneNumber: string) => {
    const client = new MongoClient(process.env.MONGO_DB_URI!);
    await client.connect();
    const db = client.db(process.env.MONGO_DB_NAME);
    const collection = db.collection('media_references');
    
    const mediaList = await collection.find({ from: phoneNumber }).toArray();
    return mediaList;
};

// Function to get media metadata by type
const getMediaMetadataByType = async (mediaType: string) => {
    const client = new MongoClient(process.env.MONGO_DB_URI!);
    await client.connect();
    const db = client.db(process.env.MONGO_DB_NAME);
    const collection = db.collection('media_references');
    
    const mediaList = await collection.find({ type: mediaType }).toArray();
    return mediaList;
};

// Function to get media that needs backup
const getMediaNeedingBackup = async () => {
    const client = new MongoClient(process.env.MONGO_DB_URI!);
    await client.connect();
    const db = client.db(process.env.MONGO_DB_NAME);
    const collection = db.collection('media_references');
    
    const mediaList = await collection.find({ 
        needsBackup: true, 
        backupStatus: 'pending' 
    }).toArray();
    return mediaList;
};

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
            const result = await handlerAI(ctx);
            console.log("result=>", result)
            
            if (result && typeof result === 'object' && result.text && result.text !== "Error processing voice message") {
                await flowDynamic(`I heard: "${result.text}"`);
                
                // Store voice note metadata in MongoDB
                if (result.metadata) {
                    const metadataId = await storeMediaMetadata(result.metadata);
                    await flowDynamic(`Voice note metadata stored! ID: ${metadataId}`);
                }
                
            } else if (typeof result === 'string' && result !== "Error processing voice message") {
                await flowDynamic(`I heard: "${result}"`);
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
    
const mediaFlow = addKeyword(EVENTS.MEDIA)
    .addAnswer('I received a media image/video',
        null,
        async (ctx, { gotoFlow, fallBack, flowDynamic }) => {
            console.log("Media ctx =>", ctx)
            
            try {
                // Get media ID from context
                const mediaId = ctx.fileData?.id;
                if (!mediaId) {
                    console.error('No media ID found in ctx.fileData');
                    await flowDynamic("Sorry, I couldn't process the media.");
                    return;
                }

                const WHATSAPP_TOKEN = process.env.JWT_TOKEN;
                if (!WHATSAPP_TOKEN) {
                    console.error('No WhatsApp token found');
                    await flowDynamic("Server configuration error.");
                    return;
                }

                // Get media URL from Graph API
                const metaUrl = `https://graph.facebook.com/v22.0/${mediaId}`;
                const metaRes = await fetch(metaUrl, {
                    headers: {
                        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                    },
                });
                const metaData = await metaRes.json() as any;
                
                if (!metaData.url) {
                    console.error('No media URL found:', metaData);
                    await flowDynamic("Could not access the media file.");
                    return;
                }

                // Determine media type and size
                const mimeType = metaData.mime_type || 'unknown';
                const fileSize = metaData.file_size || 0;
                const mediaType = getMediaTypeFromMime(mimeType);

                // Store metadata only (no file download)
                const mediaData = {
                    mediaId: mediaId,
                    mimeType: mimeType,
                    size: fileSize,
                    from: ctx.from,
                    messageId: ctx.key?.id,
                    originalUrl: metaData.url,
                    type: mediaType,
                    filename: `media-${Date.now()}-${mediaId}.${mimeType.split('/')[1] || 'bin'}`,
                    // Optional fields based on media type
                    needsBackup: shouldBackupMedia(mediaType),
                    backupStatus: 'pending'
                };

                // Store metadata in MongoDB
                const metadataId = await storeMediaMetadata(mediaData);
                console.log(`Media metadata stored with ID: ${metadataId}`);

                await flowDynamic(`Media received and metadata stored! ID: ${mediaId}`);
                await flowDynamic(`Type: ${mediaType}, Size: ${Math.round(fileSize / 1024)}KB`);
                await flowDynamic(`Metadata ID: ${metadataId}`);
                
            } catch (error) {
                console.error("Error processing media:", error);
                await flowDynamic("Sorry, there was an error processing your media.");
            }
        }
    )
const documentFlow = addKeyword(EVENTS.DOCUMENT).addAnswer("I can't read this document right now")
const locationFlow = addKeyword(EVENTS.LOCATION).addAnswer("I have received your location!")
//const voiceNoteFlow2 = addKeyword(EVENTS.VOICE_NOTE).addAnswer('Give me a second to hear you!')


const main = async () => {
    // Initialize GridFS for media storage
    await initializeGridFS();
    
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
        version: process.env.VERSION,
        webhookPath: '/whatsapp/webhook'  // Custom webhook path
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
                        <li><strong>GET</strong> /v1/media - Get media metadata</li>
                        <li><strong>GET</strong> /v1/media?user=1234567890 - Get user's media</li>
                        <li><strong>GET</strong> /v1/media?type=voice_note - Get voice notes</li>
                        <li><strong>GET</strong> /v1/media?backup=true - Get media needing backup</li>
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

    // Endpoint to get media metadata
    adapterProvider.server.get('/v1/media', async (req, res) => {
        try {
            const { user, type, backup } = req.query;
            let mediaList;

            if (user) {
                mediaList = await getMediaMetadataByUser(user as string);
            } else if (type) {
                mediaList = await getMediaMetadataByType(type as string);
            } else if (backup === 'true') {
                mediaList = await getMediaNeedingBackup();
            } else {
                // Get all media metadata
                const client = new MongoClient(process.env.MONGO_DB_URI!);
                await client.connect();
                const db = client.db(process.env.MONGO_DB_NAME);
                const collection = db.collection('media_references');
                mediaList = await collection.find({}).limit(50).toArray();
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ 
                status: 'ok', 
                count: mediaList.length, 
                media: mediaList 
            }));
        } catch (error) {
            console.error('Error getting media metadata:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ 
                status: 'error', 
                message: 'Failed to get media metadata' 
            }));
        }
    })

    // Manual webhook endpoints for custom path
    adapterProvider.server.get('/whatsapp/webhook', (req, res) => {
        // Webhook verification endpoint
        const mode = req.query['hub.mode']
        const token = req.query['hub.verify_token']
        const challenge = req.query['hub.challenge']

        if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
            console.log('Webhook verified!')
            res.writeHead(200, { 'Content-Type': 'text/plain' })
            res.end(challenge)
        } else {
            console.log('Webhook verification failed!')
            res.writeHead(403)
            res.end()
        }
    })

    adapterProvider.server.post('/whatsapp/webhook', handleCtx(async (bot, req, res) => {
        // This will handle incoming WhatsApp messages
        // The handleCtx function will process the message and route it to appropriate flows
        return res.end('OK')
    }))

    httpServer(+PORT)
}

main()
