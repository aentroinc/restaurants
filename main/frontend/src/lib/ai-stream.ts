export interface ChatEvent {
  type: 'text' | 'tool_use' | 'tool_result' | 'error' | 'done';
  content?: string;
  name?: string;
  input?: any;
  output?: any;
  session_id?: string;
  usage?: { input_tokens: number; output_tokens: number };
}

export async function* streamChat(
  message: string,
  sessionId: string | null,
  apiUrl: string = '',
): AsyncGenerator<ChatEvent> {
  const res = await fetch(`${apiUrl}/api/v1/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
  });

  if (!res.ok) {
    yield { type: 'error', content: `API error: ${res.status}` };
    return;
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      if (!part.startsWith('data: ')) continue;
      try {
        const event: ChatEvent = JSON.parse(part.slice(6));
        yield event;
      } catch {}
    }
  }
}
