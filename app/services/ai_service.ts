import { inject } from '@adonisjs/core'
import env from '#start/env'

@inject()
export class AiService {
    private apiKey: string

    constructor() {
        this.apiKey = env.get('GEMINI_API_KEY') || ''
    }

    async rewriteDescription(originalDescription: string): Promise<string> {
        if (!this.apiKey) {
            console.warn('GEMINI_API_KEY is missing. Skipping description rewrite.')
            return originalDescription
        }

        if (!originalDescription || originalDescription.length < 10) {
            return originalDescription
        }

        try {
            const prompt = `Tu es un expert en copywriting pour des événements musicaux et culturels.
Ta tâche est de réécrire les descriptions d'événements pour qu'elles soient engageantes, claires ("sympa et cohérent"), et suivent le même modèle stylistique.
Règles :
- Ton : Enthousiaste, accueillant, mais professionnel.
- Structure : Une accroche, les détails clés, et un appel à l'action ou une phrase de clôture invitante.
- Langue : Français.
- Ne pas inventer d'informations. Utilise seulement le contenu fourni.
- Si le texte est très court ou semble être juste une liste, essaie de le rendre plus fluide.
- Pas de hashtags excessifs.

Réécris cette description : \n\n${originalDescription}`

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${this.apiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [{ text: prompt }]
                            }
                        ]
                    }),
                }
            )

            if (!response.ok) {
                const errorText = await response.text()
                console.warn(`Gemini API error: ${response.status} - ${errorText}`)
                return originalDescription
            }

            const data = await response.json()
            // Gemini response structure: candidates[0].content.parts[0].text
            const rewritten = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

            return rewritten || originalDescription
        } catch (error) {
            console.error('Error rewriting description with AI:', error)
            return originalDescription
        }
    }
}
