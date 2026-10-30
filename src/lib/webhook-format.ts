// How an alert is sent to a chat webhook. Discord/Slack-style hooks take JSON; ntfy.sh (a free app that shows alerts as phone
// notifications, no account needed) takes plain text with a few headers. Pure, so it is tested without a network.
export type AlertLevel = 'info' | 'warn' | 'critical'

export function isNtfy(hook: string): boolean {
  try {
    return /(^|\.)ntfy\.sh$/i.test(new URL(hook).hostname)
  } catch {
    return false
  }
}

export function webhookInit(hook: string, level: AlertLevel, title: string, text: string): { headers: Record<string, string>; body: string } {
  if (isNtfy(hook)) {
    // ntfy headers must be plain ASCII, so the title is cleaned; the message itself may use any characters.
    const asciiTitle = title.replace(/[^\x20-\x7E]/g, '').trim().slice(0, 120) || 'Deen Companion'
    return {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', Title: `Deen Companion: ${asciiTitle}`, Priority: level === 'critical' ? '5' : level === 'warn' ? '4' : '3', Tags: level === 'critical' ? 'rotating_light' : level === 'warn' ? 'warning' : 'white_check_mark' },
      body: text,
    }
  }
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text, text }) }
}
