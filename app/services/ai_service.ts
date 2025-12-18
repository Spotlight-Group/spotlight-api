import { inject } from '@adonisjs/core'
import env from '#start/env'

@inject()
@inject()
@inject()
export class AiService {
    private ollamaHost: string

    constructor() {
        this.ollamaHost = env.get('OLLAMA_HOST') || 'http://localhost:11434'
    }

    async rewriteDescription(originalDescription: string): Promise<string> {
        if (!originalDescription || originalDescription.length < 10) {
            return originalDescription
        }

        try {
            const response = await fetch(`${this.ollamaHost}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'llama3.2',
                    messages: [
                        {
                            role: 'system',
                            content: `Tu es un expert en copywriting pour des événements musicaux et culturels.
Ta tâche est de réécrire les descriptions d'événements pour qu'elles soient engageantes, claires ("sympa et cohérent"), et suivent le même modèle stylistique.
Règles :
- Ton : Enthousiaste, accueillant, mais professionnel.
- Structure : Une accroche, les détails clés, et un appel à l'action ou une phrase de clôture invitante.
- Langue : Français.
- Ne pas inventer d'informations. Utilise seulement le contenu fourni.
- Si le texte est très court ou semble être juste une liste, essaie de le rendre plus fluide.
- Pas de hashtags excessifs.
- Renvoie uniquement la description réécrite. Ne me fait pas de phrases d'introduction avant de me l'écrire.
- Ne l'entoure PAS de guillemets.`
                        },
                        {
                            role: 'user',
                            content: `Réécris cette description : \n\n${originalDescription}`
                        }
                    ],
                    stream: false,
                    temperature: 0.7,
                }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.warn(`Ollama API error: ${response.status} - ${errorText}`)
                return originalDescription
            }

            const data = (await response.json()) as { message: { content: string } }
            let rewritten = data.message?.content?.trim()

            // Remove surrounding quotes if present
            if (rewritten && rewritten.startsWith('"') && rewritten.endsWith('"')) {
                rewritten = rewritten.slice(1, -1)
            }

            return rewritten || originalDescription
        } catch (error) {
            console.error('Error rewriting description with AI:', error)
            return originalDescription
        }
    }
}
