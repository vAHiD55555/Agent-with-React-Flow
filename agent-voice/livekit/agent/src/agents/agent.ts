import {
  defineEvent,
  onEvent,
  condition,
  log,
  step,
} from "@restackio/ai/agent";
import * as functions from "../functions";

export type EndEvent = {
  end: boolean;
};

export const messagesEvent = defineEvent<functions.Message[]>("messages");
export const endEvent = defineEvent("end");

type agentVoiceOutput = {
  messages: functions.Message[];
};

export async function agentVoice(): Promise<agentVoiceOutput> {
  let endReceived = false;
  let messages: functions.Message[] = [];

  onEvent(messagesEvent, async ({ messages, stream = true }: { messages: functions.Message[], stream?: boolean }) => {
    const result = await step<typeof functions>({}).llmChat({
      messages,
      stream
    });
    messages.push(result);
    return messages;
  });

  onEvent(endEvent, async () => {
    endReceived = true;
  });

  // We use the `condition` function to wait for the event goodbyeReceived to return `True`.
  await condition(() => endReceived);

  log.info("end condition met");
  return { messages };
}
