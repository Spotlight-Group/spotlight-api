import { inject } from '@adonisjs/core'
import env from '#start/env'

@inject()
@inject()
export class AiService {
    private apiKey: string

    constructor() {
        this.apiKey = env.get('GROQ_API_KEY') || ''
    }

    async rewriteDescription(originalDescription: string): Promise<string> {
        if (!this.apiKey) {
            console.warn('GROQ_API_KEY is missing. Skipping description rewrite.')
            return originalDescription
        }

        if (!originalDescription || originalDescription.length < 10) {
            return originalDescription
        }

        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
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
- Pas de hashtags excessifs.`
                        },
                        {
                            role: 'user',
                            content: `Réécris cette description : \n\n${originalDescription}`
                        }
                    ],
                    temperature: 0.7,
                }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                console.warn(`Groq API error: ${response.status} - ${errorText}`)
                return originalDescription
            }

            const data = await response.json()
            const rewritten = data.choices?.[0]?.message?.content?.trim()

            return rewritten || originalDescription
        } catch (error) {
            console.error('Error rewriting description with AI:', error)
            return originalDescription
        }
    }
}
