import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY não configurada no ambiente do servidor.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/ai/parse-expense', async (req, res) => {
    try {
      const { prompt, today } = req.body as { prompt?: string; today?: string };
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ error: 'Informe uma descrição do lançamento.' });
        return;
      }

      const ai = getGeminiClient();
      const referenceDate = today || new Date().toISOString().slice(0, 10);

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Extraia os dados estruturados do seguinte lançamento financeiro em português brasileiro. Data de referência (hoje): ${referenceDate}.\n\nTexto do usuário: "${prompt.trim()}"`,
        config: {
          systemInstruction:
            'Você é o motor de classificação financeira do FinAI. Extraia título limpo e natural, valor em BRL (negativo para despesas, positivo para receitas/entradas), categoria exata entre ["Alimentação", "Transporte", "Educação", "Lazer", "Outros", "Receita"], método de pagamento entre ["Débito", "Crédito", "Pix", "Transferência"], data no formato YYYY-MM-DD (use a data de referência se não especificada), e uma confirmação objetiva em 1 frase curta em português.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Descrição curta e clara do estabelecimento ou lançamento.',
              },
              amount: {
                type: Type.NUMBER,
                description: 'Valor em reais. Negativo para gastos/despesas, positivo para receitas/ganhos.',
              },
              category: {
                type: Type.STRING,
                description: 'Exatamente uma das opções: Alimentação, Transporte, Educação, Lazer, Outros, Receita.',
              },
              paymentMethod: {
                type: Type.STRING,
                description: 'Exatamente uma das opções: Débito, Crédito, Pix, Transferência.',
              },
              date: {
                type: Type.STRING,
                description: 'Data no formato YYYY-MM-DD.',
              },
              assistantNote: {
                type: Type.STRING,
                description: 'Confirmação direta e útil em português do Brasil (máximo 120 caracteres).',
              },
            },
            required: ['title', 'amount', 'category', 'paymentMethod', 'date', 'assistantNote'],
          },
        },
      });

      const raw = (response.text ?? '').trim();
      if (!raw) {
        res.status(502).json({ error: 'Resposta vazia do modelo ao analisar lançamento.' });
        return;
      }

      const parsed = JSON.parse(raw);
      res.json(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao processar lançamento com IA.';
      console.error('[/api/ai/parse-expense]', err);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, history, financialContext } = req.body as {
        message?: string;
        history?: Array<{ role: 'user' | 'assistant'; text: string }>;
        financialContext?: unknown;
      };

      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({ error: 'Envie uma pergunta para o assistente.' });
        return;
      }

      const ai = getGeminiClient();

      const historyText = (history || [])
        .slice(-6)
        .map((m) => `${m.role === 'user' ? 'Usuário' : 'FinAI'}: ${m.text}`)
        .join('\n');

      const prompt = `Contexto financeiro atual do usuário (em BRL / R$):\n${JSON.stringify(
        financialContext ?? {},
        null,
        2
      )}\n\nHistórico recente:\n${historyText || '(início da conversa)'}\n\nPergunta atual do usuário: ${message.trim()}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction:
            'Você é o consultor financeiro inteligente do FinAI. Responda sempre em português brasileiro (pt-BR), com precisão numérica usando os dados reais do contexto financeiro do usuário, formato BRL (R$ 1.234,56) e tom claro, objetivo e institucional. Evite jargões vazios. Sempre que relevante, preencha o campo structuredCard com métricas objetivas derivadas dos dados fornecidos (como resumo de categoria, projeção de economia ou alerta de orçamento).',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: 'Resposta analítica clara e objetiva em português brasileiro (2 a 4 frases).',
              },
              structuredCard: {
                type: Type.OBJECT,
                description: 'Bloco estruturado opcional com dados numéricos da análise.',
                properties: {
                  title: {
                    type: Type.STRING,
                    description: 'Título curto do card analítico.',
                  },
                  subtitle: {
                    type: Type.STRING,
                    description: 'Subtítulo ou período de referência.',
                  },
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                        value: { type: Type.STRING },
                        tone: {
                          type: Type.STRING,
                          description: 'neutral, positive ou warning',
                        },
                      },
                      required: ['label', 'value', 'tone'],
                    },
                  },
                },
                required: ['title', 'items'],
              },
            },
            required: ['reply'],
          },
        },
      });

      const raw = (response.text ?? '').trim();
      if (!raw) {
        res.status(502).json({ error: 'Resposta vazia do assistente financeiro.' });
        return;
      }

      const parsed = JSON.parse(raw);
      res.json(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao consultar assistente financeiro.';
      console.error('[/api/ai/chat]', err);
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FinAI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
