# Revisão de traduções (RF-80)

Textos sensíveis que exigem revisão por falante nativo antes de retirar `i18n_en` e `i18n_es`
da condição de `testers`. `pt-BR` é a referência; `en-US` e `es-419` são rascunho até a revisão.
Nenhuma revisão foi feita nesta sessão: data e revisor serão preenchidos em `DECISOES.md`
quando houver falante nativo disponível.

## Mensagens de acolhimento — `welcome.m1` a `welcome.m8` (RF-30)

Exibidas quando há subida (RN-05), sorteadas sem repetir a anterior. O tom não pode mudar
para culpa, punição ou julgamento (RF-31). A revisão deve preservar esse tom nos três idiomas.

| Chave | pt-BR (referência) | en-US (rascunho) | es-419 (rascunho) |
|---|---|---|---|
| `welcome.m1` | Seu corpo oscila ao longo da semana, e isso é normal. Retenção de líquido pode mudar o número sem mudar o seu progresso. | Your body fluctuates throughout the week, and that's normal. Water retention can change the number without changing your progress. | Tu cuerpo oscila durante la semana, y eso es normal. La retención de líquidos puede cambiar el número sin cambiar tu progreso. |
| `welcome.m2` | Um dia não define sua jornada. O que conta é a tendência, e você continua firme nela. | One day doesn't define your journey. What matters is the trend, and you're staying with it. | Un día no define tu camino. Lo que cuenta es la tendencia, y tú sigues en ella. |
| `welcome.m3` | Obrigado por registrar mesmo hoje. Voltar a se cuidar já é uma conquista. | Thank you for logging today. Coming back to caring for yourself is already an achievement. | Gracias por registrar hoy. Volver a cuidarte ya es un logro. |
| `welcome.m4` | O número de hoje é só um ponto no caminho. Hidratação, sono e alimentação também fazem parte dessa conta. | Today's number is just one point on the path. Hydration, sleep and food are part of the picture too. | El número de hoy es solo un punto del camino. La hidratación, el sueño y la alimentación también cuentan. |
| `welcome.m5` | Pequenas variações fazem parte do processo. Continue se observando com curiosidade e gentileza. | Small variations are part of the process. Keep noticing your body with curiosity and kindness. | Las pequeñas variaciones son parte del proceso. Sigue observándote con curiosidad y amabilidad. |
| `welcome.m6` | Você está construindo uma rotina, e rotinas se fazem dia a dia. Este registro já faz parte dela. | You're building a routine, and routines are made day by day. This log is already part of it. | Estás construyendo una rutina, y las rutinas se hacen día a día. Este registro ya forma parte de ella. |
| `welcome.m7` | Não é preciso acertar todos os dias. O importante é continuar voltando, no seu ritmo. | You don't have to get it right every day. What matters is coming back, at your own pace. | No hace falta acertar todos los días. Lo importante es volver, a tu propio ritmo. |
| `welcome.m8` | A tendência é o que importa, e ela se desenha com o tempo. Seu cuidado de hoje conta para ela. | The trend is what matters, and it takes shape over time. Today's care counts toward it. | Lo que importa es la tendencia, y se dibuja con el tiempo. Tu cuidado de hoy cuenta para ella. |

## Outros textos sensíveis

### Aviso de peso-alvo (RN-10)

Texto neutro, sem número e sem bloquear o cadastro; aparece mesmo com o IMC oculto.

| Chave | pt-BR (referência) | en-US (rascunho) | es-419 (rascunho) |
|---|---|---|---|
| `bmi.targetWarning` | Esse peso-alvo está abaixo da faixa considerada saudável para a sua altura. Vale conversar com um profissional de saúde antes de seguir com ele. | This target weight is below the range considered healthy for your height. It may help to talk to a health professional before following it. | Este peso objetivo está por debajo del rango considerado saludable para tu altura. Vale la pena hablar con un profesional de salud antes de seguirlo. |
| `goals.errorTarget` | O peso-alvo deve ser menor que o peso inicial. | The target weight must be lower than your starting weight. | El peso objetivo debe ser menor que el peso inicial. |
| `onboarding.error.target` | O peso-alvo deve ser menor que o peso atual. | The target weight must be lower than your current weight. | El peso objetivo debe ser menor que el peso actual. |

### Nota e faixas do IMC (RF-61)

| Chave | pt-BR (referência) | en-US (rascunho) | es-419 (rascunho) |
|---|---|---|---|
| `bmi.note` | O IMC é uma referência geral para adultos. Ele não considera massa muscular, idade ou distribuição de gordura, e as faixas não se aplicam a menores de 18 anos nem são ideais a partir dos 60. Converse com um profissional de saúde para interpretá-lo. | BMI is a general reference for adults. It does not account for muscle mass, age or fat distribution, and the ranges do not apply to people under 18 and are not ideal from age 60 onward. Talk to a health professional to interpret it. | El IMC es una referencia general para adultos. No considera la masa muscular, la edad ni la distribución de grasa, y los rangos no se aplican a menores de 18 años ni son ideales desde los 60. Habla con un profesional de salud para interpretarlo. |
| `bmi.category.underweight` | Abaixo do peso | Underweight | Bajo peso |
| `bmi.category.adequate` | Peso adequado | Healthy weight | Peso adecuado |
| `bmi.category.overweight` | Sobrepeso | Overweight | Sobrepeso |
| `bmi.category.obesity1` | Obesidade grau I | Obesity class I | Obesidad grado I |
| `bmi.category.obesity2` | Obesidade grau II | Obesity class II | Obesidad grado II |
| `bmi.category.obesity3` | Obesidade grau III | Obesity class III | Obesidad grado III |

### Consentimento (RF-46)

Além da revisão linguística, exige leitura jurídica nos três idiomas.

| Chave | pt-BR (referência) | en-US (rascunho) | es-419 (rascunho) |
|---|---|---|---|
| `auth.register.consentBefore` | Aceito o tratamento dos meus dados de saúde (peso, hábitos, humor e, se eu optar, altura para o IMC) para o funcionamento do app, nos termos da | I accept the processing of my health data (weight, habits, mood and, if I choose, height for BMI) to run the app, under the | Acepto el tratamiento de mis datos de salud (peso, hábitos, ánimo y, si lo elijo, altura para el IMC) para que la app funcione, según la |
| `auth.register.consentLink` | Política de Privacidade | Privacy Policy | Política de Privacidad |
| `auth.register.consentAfter` | . | . | . |

### Política de privacidade (`privacy.*`, Fase 10)

| Chave | pt-BR (referência) | en-US (rascunho) | es-419 (rascunho) |
|---|---|---|---|
| `privacy.data` | Para o app funcionar, guardamos no aparelho seu peso, hábitos, humor e, se você optar, a altura para o IMC. | To work, the app stores your weight, habits, mood and, if you choose, height for BMI on this device. | Para funcionar, la app guarda en el dispositivo tu peso, hábitos, ánimo y, si lo eliges, la altura para el IMC. |
| `privacy.storage` | Os dados sincronizam com sua conta apenas para você acessar em outros aparelhos. | Data syncs with your account only so you can access it on other devices. | Los datos se sincronizan con tu cuenta solo para que puedas acceder desde otros dispositivos. |
| `privacy.photos` | As fotos de progresso ficam somente no aparelho e não são enviadas. | Progress photos stay on this device and are never uploaded. | Las fotos de progreso se quedan solo en el dispositivo y no se envían. |
| `privacy.noSale` | Nada é vendido ou compartilhado com terceiros. | Nothing is sold or shared with third parties. | Nada se vende ni se comparte con terceros. |
| `privacy.noAnalytics` | Não usamos analytics nem ferramentas de terceiros. | We do not use analytics or third-party tools. | No usamos analytics ni herramientas de terceros. |
| `privacy.publicPage` | A página pública de apresentação mostra apenas totais anônimos. | The public presentation page shows only anonymous totals. | La página pública de presentación muestra solo totales anónimos. |
| `privacy.disclaimer` | Este app não substitui o acompanhamento de profissionais de saúde. | This app does not replace care from health professionals. | Esta app no sustituye la atención de profesionales de salud. |

## Registro da revisão

Preencher quando houver revisor: idioma, data (AAAA-MM-DD), nome do revisor e alterações feitas.

| Idioma | Data | Revisor | Resultado |
|---|---|---|---|
| en-US | — | — | Pendente |
| es-419 | — | — | Pendente |
