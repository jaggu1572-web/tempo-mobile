// Lets `node --experimental-strip-types` resolve the extensionless imports Metro uses.
export async function resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.\w+$/.test(specifier)) {
    try { return await next(specifier + '.ts', context); } catch {}
  }
  return next(specifier, context);
}
