// api/proxy.js
export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const decodedUrl = decodeURIComponent(url);
    
    // Проверяем, что URL валидный
    const urlObj = new URL(decodedUrl);
    
    // Разрешаем только HTTP/HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return res.status(400).json({ error: 'Invalid protocol' });
    }

    // Подготавливаем опции для fetch
    const fetchOptions = {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, */*',
      }
    };

    // Для POST запросов добавляем тело
    if (req.method === 'POST' || req.method === 'PUT') {
      fetchOptions.headers['Content-Type'] = 'application/json';
      
      // Если есть тело запроса, передаем его
      if (req.body && Object.keys(req.body).length > 0) {
        fetchOptions.body = JSON.stringify(req.body);
      } else {
        // Для POST запросов без тела отправляем пустой объект
        fetchOptions.body = '{}';
      }
    }

    console.log(`Making ${req.method} request to:`, decodedUrl);
    console.log('Fetch options:', fetchOptions);

    const response = await fetch(decodedUrl, fetchOptions);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Определяем тип контента
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Устанавливаем заголовки CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Обрабатываем разные типы контента
    if (contentType.includes('application/json')) {
      const data = await response.json();
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(data);
    } else if (contentType.includes('application/pdf')) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    } else {
      // Для других типов возвращаем текст
      const text = await response.text();
      res.setHeader('Content-Type', contentType);
      return res.send(text);
    }

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch resource: ' + error.message,
      details: error.stack 
    });
  }
}

// Обработчик OPTIONS для CORS preflight
export async function options(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.status(200).end();
}

export const config = {
  api: {
    responseLimit: false,
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
