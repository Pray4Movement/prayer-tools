// The Prayer.Tools feedback widget on every admin page (bugs, ideas, problems
// with the site or app). No-op when no board project is configured.
function mount(apiBase: string, projectId: string) {
  if (!document.querySelector('script[data-feedback-widget]')) {
    const s = document.createElement('script')
    s.src = `${apiBase}/js/feedback-web-component.iife.js`
    s.async = true
    s.dataset.feedbackWidget = '1'
    document.head.appendChild(s)
  }
  if (document.querySelector('feedback-web-component')) return
  const slot = document.createElement('div')
  slot.className = 'feedback-widget-slot'
  const el = document.createElement('feedback-web-component')
  el.setAttribute('profile-config', JSON.stringify({ profile: 'chat-bubble', instanceId: 'fb-admin', projectId, apiBase, enabled: true, showByDefault: true }))
  slot.appendChild(el)
  document.body.appendChild(slot)
}

export default defineNuxtPlugin(() => {
  fetch('/api/pt/meta')
    .then(r => r.json() as Promise<{ feedback: { apiBase: string, projectId: string } }>)
    .then((meta) => {
      const apiBase = meta.feedback.apiBase.replace(/\/$/, '')
      if (meta.feedback.projectId && apiBase) mount(apiBase, meta.feedback.projectId)
    })
    .catch(() => {})
})
