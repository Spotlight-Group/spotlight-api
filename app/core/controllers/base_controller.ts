import type { HttpContext } from '@adonisjs/core/http'

/**
 * Base controller providing common utility methods for all controllers
 */
export default class BaseController {
    /**
     * Send a successful response with data
     */
    protected success(ctx: HttpContext, data: any, message = 'Success', statusCode = 200): void {
        ctx.response.status(statusCode).json({
            message,
            data,
        })
    }

    /**
     * Send a successful response with paginated data
     */
    protected successWithPagination(
        ctx: HttpContext,
        paginatedData: any,
        message = 'Success'
    ): void {
        ctx.response.status(200).json({
            message,
            data: paginatedData.all(),
            meta: paginatedData.getMeta(),
        })
    }

    /**
     * Send a created response (201)
     */
    protected created(ctx: HttpContext, data: any, message = 'Created successfully'): void {
        ctx.response.status(201).json({
            message,
            data,
        })
    }

    /**
     * Send a no content response (204)
     */
    protected noContent(ctx: HttpContext): void {
        ctx.response.status(204).send('')
    }

    /**
     * Send a bad request error response (400)
     */
    protected badRequest(ctx: HttpContext, message: string, error?: string): void {
        ctx.response.status(400).json({
            message,
            error,
        })
    }

    /**
     * Send an unauthorized error response (401)
     */
    protected unauthorized(ctx: HttpContext, message = 'Unauthorized'): void {
        ctx.response.status(401).json({
            message,
        })
    }

    /**
     * Send a forbidden error response (403)
     */
    protected forbidden(ctx: HttpContext, message = 'Forbidden'): void {
        ctx.response.status(403).json({
            message,
        })
    }

    /**
     * Send a not found error response (404)
     */
    protected notFound(ctx: HttpContext, message: string, error?: string): void {
        ctx.response.status(404).json({
            message,
            error,
        })
    }

    /**
     * Send a validation error response (422)
     */
    protected validationError(ctx: HttpContext, message: string, errors: any[] = []): void {
        ctx.response.status(422).json({
            message,
            errors,
        })
    }

    /**
     * Send an internal server error response (500)
     */
    protected internalServerError(
        ctx: HttpContext,
        message = 'An error occurred',
        error?: string
    ): void {
        ctx.response.status(500).json({
            message,
            error,
        })
    }

    /**
     * Handle common validation errors
     */
    protected handleValidationError(ctx: HttpContext, error: any): void {
        if (error?.messages) {
            this.validationError(ctx, 'Validation failed', error.messages)
            return
        }
        this.badRequest(ctx, 'Validation failed')
    }

    /**
     * Handle common exceptions
     */
    protected handleException(ctx: HttpContext, error: any, customMessage?: string): void {
        // Handle specific error types
        if (error?.message === 'User not found' || error?.message?.includes('not found')) {
            this.notFound(ctx, error.message)
            return
        }

        if (error?.message?.includes('Unauthorized')) {
            this.unauthorized(ctx, error.message)
            return
        }

        // Default to internal server error
        this.internalServerError(ctx, customMessage || 'An error occurred', error?.message)
    }
}
