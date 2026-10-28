// Apunta el webhook del número de WhatsApp a una dirección nueva (p. ej. cuando cambia el túnel).
// Solo cambia este número; el webhook de la app queda igual.
//
// Uso: npx tsx --env-file=.env scripts/conectar-meta.ts https://algo.trycloudflare.com
const { WA_TOKEN, WA_PHONE_ID, WA_VERIFY_TOKEN } = process.env
const base = process.argv[2]?.replace(/\/$/, '')
if (!base) throw new Error('Falta la dirección pública, p. ej. https://algo.trycloudflare.com')
const v = process.env.WA_API_VERSION || 'v21.0'
const api = `https://graph.facebook.com/${v}/${WA_PHONE_ID}`
const auth = { Authorization: `Bearer ${WA_TOKEN}` }

const r = await fetch(api, {
  method: 'POST',
  headers: { ...auth, 'Content-Type': 'application/json' },
  body: JSON.stringify({ webhook_configuration: { override_callback_uri: `${base}/wa`, verify_token: WA_VERIFY_TOKEN } }),
})
console.log('cambio', r.status, JSON.stringify(await r.json()))
const g = await fetch(`${api}?fields=webhook_configuration,status`, { headers: auth })
console.log('ahora', g.status, JSON.stringify(await g.json()))
