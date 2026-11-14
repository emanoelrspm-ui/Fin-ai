import { jsonResponse } from '../_lib/responses';
import { AuthContextData, Env } from '../_lib/types';

export const onRequestGet: PagesFunction<Env, string, AuthContextData> = async (
  context
) => {
  return jsonResponse({
    id: context.data.userId,
    email: context.data.email,
    name: context.data.name,
  });
};
