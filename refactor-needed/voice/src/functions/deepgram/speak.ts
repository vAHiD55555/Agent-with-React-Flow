import { FunctionFailure, log } from "@restackio/ai/function";
import { Buffer } from "node:buffer";
import { deepgramClient } from "./utils/client";
import { SpeakSchema } from "@deepgram/sdk";

const getAudioBuffer = async (stream: ReadableStream<Uint8Array>) => {
  const reader = stream.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    chunks.push(value);
  }

  const dataArray = chunks.reduce(
    (acc, chunk) => Uint8Array.from([...acc, ...chunk]),
    new Uint8Array(0)
  );

  const buffer = Buffer.from(dataArray.buffer);
  return buffer;
};

export async function deepgramSpeak({
  text,
  options = {
    model: "aura-arcas-en",
  },
  twilioEncoding,
  apiKey,
}: {
  text: string;
  options?: SpeakSchema;
  twilioEncoding?: boolean;
  apiKey?: string;
}) {
  if (!text.length) {
    log.error("Text is empty");
    throw FunctionFailure.nonRetryable("Text is empty");
  }

  try {
    const deepgram = deepgramClient();
    const response = await deepgram.speak.request(
      { text },
      {
        ...options,
        ...(twilioEncoding && {
          encoding: "mulaw",
          sample_rate: 8000,
          container: "none",
        }),
      }
    );
    const stream = await response.getStream();

    if (!stream) {
      log.error("Deepgram speak stream error", { response });
      throw new Error(`Deepgram speak stream error ${response}`);
    }

    const buffer = await getAudioBuffer(stream);
    if (!buffer) {
      log.error("Deepgram audio buffer error", { stream });
      throw new Error(`Deepgram audio buffer error ${stream}`);
    }
    const base64String = buffer.toString("base64");
    log.info("deepgramSpeak: ", {
      audioLength: base64String.length,
    });
    return {
      media: {
        payload: base64String,
      },
    };
  } catch (error) {
    log.error("Deepgram TTS error", { error });
    throw new Error(`Deepgram TTS error ${error}`);
  }
}
