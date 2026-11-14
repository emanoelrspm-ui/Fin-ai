import { requireDB } from '../../_lib/db';
import { errorResponse, jsonResponse } from '../../_lib/responses';
import { AuthContextData, Env } from '../../_lib/types';

export const onRequestDelete: PagesFunction<
  Env,
  string,
  AuthContextData
> = async (context) => {
  try {
    const db = requireDB(context.env);
    const userId = context.data.userId;

    // 1. Remover objetos privados do usuário no R2
    let deletedR2Count = 0;
    if (context.env.BUCKET) {
      const prefix = `receipts/${userId}/`;
      let cursor: string | undefined = undefined;
      do {
        const listed = await context.env.BUCKET.list({
          prefix,
          cursor,
        });
        if (listed.objects.length > 0) {
          const keys = listed.objects.map((obj) => obj.key);
          await context.env.BUCKET.delete(keys);
          deletedR2Count += keys.length;
        }
        cursor = listed.truncated ? listed.cursor : undefined;
      } while (cursor);
    }

    // 2. Remover registros do usuário nas tabelas D1
    const tables = ['expenses', 'budgets', 'merchant_rules', 'ai_usage'];
    for (const table of tables) {
      await db
        .prepare(`DELETE FROM ${table} WHERE user_id = ?`)
        .bind(userId)
        .run()
        .catch(() => {
          // Ignora caso alguma tabela auxiliar não exista no ambiente
        });
    }

    return jsonResponse({
      deleted: true,
      receipts_deleted: deletedR2Count,
    });
  } catch {
    return errorResponse(
      500,
      'INTERNAL_ERROR',
      'Não foi possível excluir os dados da conta.'
    );
  }
};
