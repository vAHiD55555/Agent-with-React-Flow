import { heartbeat, currentWorkflow, log } from "@restackio/ai/function";
import { websocketConnect } from "./utils/client";
import Restack from "@restackio/ai";
import { SendWorkflowEvent } from "@restackio/ai/event";

export async function websocketListen({
  streamSid,
  events,
  address,
}: {
  streamSid: string;
  events?: {
    websocketEventName: string;
    workflowEventName: string;
    workflow?: SendWorkflowEvent["workflow"];
  }[];
  address?: string;
}) {
  return new Promise<void>(async (resolve) => {
    const ws = await websocketConnect({ address });

    const restack = new Restack();
    const workflow = currentWorkflow().workflowExecution;

    ws.on("message", (data) => {
      const message = JSON.parse(data.toString());
      if (message.streamSid === streamSid) {
        if (events) {
          events.forEach((listenEvent) => {
            if (message.event === listenEvent.websocketEventName) {
              if (message.media && message.media.track !== "inbound") {
                return;
              }

              const workflowEvent: SendWorkflowEvent = {
                event: {
                  name: listenEvent.workflowEventName,
                  input: {
                    streamSid,
                    data: message.data,
                    media: message.media,
                  },
                },
                workflow: {
                  ...workflow,
                  ...listenEvent.workflow,
                },
              };
              log.debug(`${message.event} sendWorkflowEvent`, {
                workflowEvent,
              });

              restack.sendWorkflowEvent(workflowEvent);
            }
          });
        }
        heartbeat(message.streamSid);
        if (message.event === "stop") {
          resolve();
        }
      }
    });
  });
}
