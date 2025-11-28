// This serverless function proxies WebSocket connections to your chat server
// Note: Netlify Functions don't support WebSocket connections directly
// You'll need to deploy your chat server separately (e.g., on Render, Railway, or Heroku)

exports.handler = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      message: 'Chat server should be deployed separately. WebSocket connections cannot be proxied through Netlify Functions.',
      chatServerUrl: process.env.CHAT_SERVER_URL || 'https://your-chat-server.herokuapp.com'
    })
  };
};