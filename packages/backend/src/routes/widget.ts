import { Router } from 'express';

const router = Router();

// Serve embeddable widget JS
router.get('/embed.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
(function() {
  var config = window.AIChatConfig || {};
  var apiKey = config.apiKey || '';
  var baseUrl = config.baseUrl || window.location.origin;
  var position = config.position || 'bottom-right';
  var theme = config.theme || 'light';
  var title = config.title || 'AI Assistant';

  // Styles
  var style = document.createElement('style');
  style.textContent = \`
    .ai-chat-widget { position: fixed; z-index: 99999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .ai-chat-widget.bottom-right { bottom: 20px; right: 20px; }
    .ai-chat-widget.bottom-left { bottom: 20px; left: 20px; }
    .ai-chat-toggle { width: 56px; height: 56px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: transform 0.2s; background: #2563eb; color: white; font-size: 24px; }
    .ai-chat-toggle:hover { transform: scale(1.1); }
    .ai-chat-panel { width: 380px; height: 520px; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.12); display: none; flex-direction: column; margin-bottom: 12px; }
    .ai-chat-panel.open { display: flex; }
    .ai-chat-panel.light { background: #fff; color: #1f2937; }
    .ai-chat-panel.dark { background: #1f2937; color: #f3f4f6; }
    .ai-chat-header { padding: 16px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e5e7eb; }
    .ai-chat-panel.dark .ai-chat-header { border-color: #374151; }
    .ai-chat-messages { flex: 1; overflow-y: auto; padding: 16px; }
    .ai-chat-msg { margin-bottom: 12px; max-width: 85%; }
    .ai-chat-msg.user { margin-left: auto; }
    .ai-chat-msg .bubble { padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
    .ai-chat-msg.user .bubble { background: #2563eb; color: white; border-bottom-right-radius: 4px; }
    .ai-chat-msg.assistant .bubble { background: #f3f4f6; color: #1f2937; border-bottom-left-radius: 4px; }
    .ai-chat-panel.dark .ai-chat-msg.assistant .bubble { background: #374151; color: #f3f4f6; }
    .ai-chat-input-area { padding: 12px; border-top: 1px solid #e5e7eb; display: flex; gap: 8px; }
    .ai-chat-panel.dark .ai-chat-input-area { border-color: #374151; }
    .ai-chat-input-area input { flex: 1; border: 1px solid #d1d5db; border-radius: 8px; padding: 8px 12px; font-size: 14px; outline: none; }
    .ai-chat-panel.dark .ai-chat-input-area input { background: #374151; border-color: #4b5563; color: #f3f4f6; }
    .ai-chat-input-area button { background: #2563eb; color: white; border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer; font-size: 14px; }
    .ai-chat-input-area button:disabled { opacity: 0.5; }
  \`;
  document.head.appendChild(style);

  // Widget HTML
  var widget = document.createElement('div');
  widget.className = 'ai-chat-widget ' + position;
  widget.innerHTML = \`
    <div class="ai-chat-panel \${theme}" id="ai-chat-panel">
      <div class="ai-chat-header">
        <span>\${title}</span>
        <button onclick="document.getElementById('ai-chat-panel').classList.remove('open')" style="background:none;border:none;cursor:pointer;font-size:18px;color:inherit;">&times;</button>
      </div>
      <div class="ai-chat-messages" id="ai-chat-messages"></div>
      <div class="ai-chat-input-area">
        <input type="text" id="ai-chat-input" placeholder="Type a message..." />
        <button id="ai-chat-send">Send</button>
      </div>
    </div>
    <button class="ai-chat-toggle" id="ai-chat-toggle">&#x1F4AC;</button>
  \`;
  document.body.appendChild(widget);

  var panel = document.getElementById('ai-chat-panel');
  var toggle = document.getElementById('ai-chat-toggle');
  var messages = document.getElementById('ai-chat-messages');
  var input = document.getElementById('ai-chat-input');
  var send = document.getElementById('ai-chat-send');
  var conversationId = null;
  var isLoading = false;

  toggle.onclick = function() { panel.classList.toggle('open'); input.focus(); };

  function addMessage(role, text) {
    var div = document.createElement('div');
    div.className = 'ai-chat-msg ' + role;
    div.innerHTML = '<div class="bubble">' + text.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>';
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
    return div;
  }

  async function sendMessage() {
    var text = input.value.trim();
    if (!text || isLoading) return;
    input.value = '';
    isLoading = true;
    send.disabled = true;

    addMessage('user', text);
    var assistantDiv = addMessage('assistant', '...');

    try {
      var res = await fetch(baseUrl + '/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({ message: text, conversation_id: conversationId })
      });
      var data = await res.json();
      if (data.error) throw new Error(data.error);
      conversationId = data.conversation_id;
      assistantDiv.querySelector('.bubble').textContent = data.message;
    } catch(e) {
      assistantDiv.querySelector('.bubble').textContent = 'Error: ' + e.message;
    }
    isLoading = false;
    send.disabled = false;
    input.focus();
  }

  send.onclick = sendMessage;
  input.onkeydown = function(e) { if (e.key === 'Enter') sendMessage(); };
})();
  `);
});

// Widget config page
router.get('/demo', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html><head><title>Widget Demo</title></head>
<body style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
  <h1>AI Chat Widget Demo</h1>
  <p>This is a demo page showing the embeddable chat widget.</p>
  <p>Add this to any website:</p>
  <pre style="background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto;">&lt;script&gt;
  window.AIChatConfig = {
    apiKey: 'YOUR_API_KEY',
    baseUrl: '${''/* will be set dynamically */}',
    theme: 'light',
    title: 'AI Assistant'
  };
&lt;/script&gt;
&lt;script src="/api/widget/embed.js"&gt;&lt;/script&gt;</pre>
  <script>
    window.AIChatConfig = { apiKey: 'demo', baseUrl: '', theme: 'light', title: 'AI Assistant' };
  </script>
  <script src="/api/widget/embed.js"></script>
</body></html>`);
});

export default router;
