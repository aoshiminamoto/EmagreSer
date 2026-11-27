// Gera um par VAPID novo e imprime as variáveis de ambiente; nunca salva em arquivo.
import webpush from 'web-push'

const keys = webpush.generateVAPIDKeys()
console.log('Copie para o .env (ou para o gerenciador de segredos):')
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
console.log('VAPID_SUBJECT=mailto:contato@example.com')
