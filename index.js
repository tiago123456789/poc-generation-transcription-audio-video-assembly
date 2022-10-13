require("dotenv").config()
const axios = require("axios")
const fs = require("fs/promises");
const srtConvert = require('aws-transcription-to-srt')

const API_KEY = process.env.API_KEY;
const ASSEMBLY_BASE_URL = process.env.ASSEMBLY_BASE_URL

class AssemblyAi {

    async uploadLocalFile(path) {
        const assembly = axios.create({
            baseURL: ASSEMBLY_BASE_URL,
            headers: {
                authorization: API_KEY,
                "content-type": "application/json",
                "transfer-encoding": "chunked",
            },
        });


        const file = path;
        const data = await fs.readFile(file)
        const response = await assembly
            .post("/upload", data);

        return response.data;
    }

    async transcribe(fileURL, languageCode = 'pt') {
        const assembly = axios.create({
            baseURL: ASSEMBLY_BASE_URL,
            headers: {
                authorization: API_KEY,
                "content-type": "application/json",
            },
        });


        const response = await assembly
            .post("/transcript", {
                audio_url: fileURL,
                language_code: languageCode
            })

        return response.data;
    }

    async getTranscriptionGenerated(idTranscribeProcess) {
        const assembly = axios.create({
            baseURL: ASSEMBLY_BASE_URL,
            headers: {
                authorization: API_KEY,
                "content-type": "application/json",
            },
        });

        const response = await assembly
            .get(`/transcript/${idTranscribeProcess}`)

        return response.data;
    }
}

async function processTranscriptionToCreateSubtitleFile(transcription, filename) {
    const subtitlesStructuredToGenerateSRT = transcription.words.map(item => {
        return {
            start_time: item.start / 1000,
            end_time: item.end / 1000,
            alternatives: [
                {
                    confidence: item.confidence,
                    content: item.text
                }
            ],
        }
    })

    const srt = srtConvert({
        results: {
            items: subtitlesStructuredToGenerateSRT
        }
    })

    await fs.writeFile(filename, srt)
}

async function generateSubtitles() {
    try {
        const transcriberService = new AssemblyAi();
        console.log("Uploading audio or video to next step make transcription")
        const data = await transcriberService.uploadLocalFile("./king-crab.mp4")
        console.log("Sending data for execute transcription of audio ou video")
        const transcribeProcessReturned = await transcriberService.transcribe(
            data.upload_url, "pt"
        )
    
        console.log("Waiting transcription process finish to generate subtitle file")
        setTimeout(async () => {
            const transcription = await transcriberService.getTranscriptionGenerated(
                transcribeProcessReturned.id
            );
            
            console.log("Generating subtitles for audio or video uploaded")
            processTranscriptionToCreateSubtitleFile(
                transcription, "subtitle_test.srt"
            )
            console.log("Generated subtitles for audio or video uploaded")
        }, 30000)

    } catch(error) {
        console.log(error)
    }
    
}

generateSubtitles()