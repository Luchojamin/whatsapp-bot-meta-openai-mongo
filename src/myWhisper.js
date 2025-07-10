import { Configuration, OpenAIApi } from "openai";
import ffmpegPath from "@ffmpeg-installer/ffmpeg";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import fetch from "node-fetch";

ffmpeg.setFfmpegPath(ffmpegPath.path);

const voiceToText = async (path) => {
    if (!fs.existsSync(path)) {
        throw new Error("No se encuentra el archivo");
    }
    // Check file size
    const stats = fs.statSync(path);
    console.log(`File size: ${stats.size} bytes`);
    if (stats.size === 0) {
        throw new Error("File is empty");
    }
    try {
        const configuration = new Configuration({
            apiKey: process.env.OPENAI_API_KEY,
        });
        const openai = new OpenAIApi(configuration);
        const resp = await openai.createTranscription(
            fs.createReadStream(path),
            "whisper-1"
        );
        return resp.data.text;
    } catch (err) {
        console.error('Whisper API error:', err);
        if (err.response) {
            console.error('Response data:', err.response.data);
        }
        return "ERROR";
    }
};

const convertOggMp3 = async (inputStream, outStream) => {
    return new Promise((resolve, reject) => {
        ffmpeg(inputStream)
            .audioQuality(96)
            .toFormat("mp3")
            .save(outStream)
            .on("progress", (p) => null)
            .on("end", () => {
                resolve(true);
            });
    });
};

const handlerAI = async (ctx) => {
    try {
        const tmpDir = `${process.cwd()}/tmp`;
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        // WhatsApp Cloud API: Step 1 - Get media ID from ctx
        const mediaId = ctx.fileData?.id;
        if (!mediaId) {
            console.error('No media ID found in ctx.fileData');
            return "No media ID found in the message.";
        }
        const WHATSAPP_TOKEN = process.env.JWT_TOKEN;
        if (!WHATSAPP_TOKEN) {
            console.error('No WhatsApp token found in environment variables');
            return "Server misconfiguration: missing WhatsApp token.";
        }

        // Step 2: Get the media URL from the Graph API
        const metaUrl = `https://graph.facebook.com/v22.0/${mediaId}`;
        const metaRes = await fetch(metaUrl, {
            headers: {
                Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            },
        });
        const metaData = await metaRes.json();
        if (!metaData.url) {
            console.error('No media URL found in Graph API response:', metaData);
            return "No media URL found for the audio.";
        }

        // Step 3: Download the audio file from the media URL
        const audioRes = await fetch(metaData.url, {
            headers: {
                Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            },
        });
        if (!audioRes.ok) {
            console.error('Failed to download audio file:', await audioRes.text());
            return "Failed to download the audio file.";
        }
        const audioBuffer = await audioRes.buffer();
        console.log(`Downloaded ${audioBuffer.length} bytes from WhatsApp media API`);

        const pathTmpOgg = `${tmpDir}/voice-note-${Date.now()}.ogg`;
        const pathTmpMp3 = `${tmpDir}/voice-note-${Date.now()}.mp3`;
        await fs.writeFileSync(pathTmpOgg, audioBuffer);

        // Convert OGG to MP3 and transcribe
        try {
            await convertOggMp3(pathTmpOgg, pathTmpMp3);
            const text = await voiceToText(pathTmpMp3);
            // Clean up temporary files
            fs.unlink(pathTmpMp3, (error) => {
                if (error) console.error('Error deleting mp3:', error);
            });
            fs.unlink(pathTmpOgg, (error) => {
                if (error) console.error('Error deleting ogg:', error);
            });
            return text;
        } catch (conversionError) {
            console.error('Conversion error:', conversionError);
            // Try to transcribe the original OGG file directly
            const text = await voiceToText(pathTmpOgg);
            // Clean up
            fs.unlink(pathTmpOgg, (error) => {
                if (error) console.error('Error deleting ogg:', error);
            });
            return text;
        }
    } catch (error) {
        console.error('Error in handlerAI:', error);
        return "Error processing voice message";
    }
};

export { handlerAI };