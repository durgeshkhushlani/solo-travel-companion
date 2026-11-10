// Scripted fake for the LlmClient port: answers come from a queue, requests are recorded.
// An answer that is an Error is thrown instead of returned.
export function createScriptedLlm(script) {
  const queue = [...script];
  const requests = [];
  return {
    requests,
    async generate(request) {
      requests.push(structuredClone(request));
      const next = queue.shift();
      if (next === undefined) throw new Error('scripted llm ran out of answers');
      if (next instanceof Error) throw next;
      return { text: '', toolCalls: [], ...next };
    },
  };
}

export const say = (text) => ({ text });
export const callTool = (name, args = {}) => ({ toolCalls: [{ name, args }] });
