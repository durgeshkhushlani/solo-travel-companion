// Travel Assistant: a bounded tool loop. The model may ask for Assistant Tools; we run them and
// show the results; the loop ends on a plain-text answer or when the step budget is spent.
const SYSTEM = [
  'You are the Travel Assistant of a solo travel companion app.',
  'Answer questions about Travel Plans using the tools; never invent plans, dates or people.',
  'If the tools return nothing useful, say so plainly.',
].join(' ');

export const STEP_LIMIT_REPLY =
  'Sorry, I could not finish looking that up. Please try a more specific question.';

// What the model sees of a tool: everything except the function that runs it.
const declare = ({ name, description, parameters }) => ({ name, description, parameters });

// The model chooses the tool name and arguments, so both are untrusted. A failure becomes an
// error result the model can react to; its message is generic so no stack or internals leak.
async function runTool(tools, { name, args }) {
  const tool = tools.find((t) => t.name === name);
  if (!tool) return { error: `unknown tool "${name}"` };
  try {
    return await tool.run(args ?? {});
  } catch {
    return { error: 'the tool failed' };
  }
}

// One step = one call to the model. Returns { reply, steps }.
export async function runAssistant({ llm, tools, messages, maxSteps = 5 }) {
  const conversation = [...messages];
  const declarations = tools.map(declare);

  for (let step = 1; step <= maxSteps; step += 1) {
    const answer = await llm.generate({
      system: SYSTEM,
      messages: [...conversation],
      tools: declarations,
    });
    if (answer.toolCalls.length === 0) return { reply: answer.text, steps: step };

    for (const call of answer.toolCalls) {
      const result = await runTool(tools, call);
      conversation.push({ role: 'tool', name: call.name, args: call.args, result });
    }
  }
  return { reply: STEP_LIMIT_REPLY, steps: maxSteps };
}
