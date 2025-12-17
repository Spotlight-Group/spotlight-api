import { Exception } from '@adonisjs/core/exceptions'
import type { HttpContext } from '@adonisjs/core/http'

export default class ValidationException extends Exception {
    static status = 422
    static code = 'E_VALIDATION_FAILED'

    constructor(
        message: string,
        public errors: any[] = []
    ) {
        super(message)
    }

    /**
     * Handle the exception and return a JSON response with validation errors
     */
    async handle(error: this, ctx: HttpContext) {
        ctx.response.status(error.status).json({
            message: error.message,
            code: error.code || ValidationException.code,
            errors: error.errors,
        })
    }
}
