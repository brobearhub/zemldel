import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiValidationIssueDto {
  @ApiProperty({ type: [String] })
  path!: string[];

  @ApiProperty()
  message!: string;
}

/**
 * Broad error envelope for Swagger docs.
 * Matches:
 * - Nest default HttpException body: { statusCode, message, error }
 * - Custom validation bodies in this codebase: { error, issues }
 */
export class ApiErrorResponseDto {
  @ApiPropertyOptional({ example: 400 })
  statusCode?: number;

  @ApiPropertyOptional({ example: 'Bad Request' })
  error?: string;

  @ApiPropertyOptional({ example: 'Validation failed' })
  message?: string;

  @ApiPropertyOptional({ type: [ApiValidationIssueDto] })
  issues?: ApiValidationIssueDto[];
}

// Specific error DTOs (for more precise Swagger responses)
export class ApiBadRequestErrorDto extends ApiErrorResponseDto {}
export class ApiUnauthorizedErrorDto extends ApiErrorResponseDto {}
export class ApiForbiddenErrorDto extends ApiErrorResponseDto {}
export class ApiNotFoundErrorDto extends ApiErrorResponseDto {}
export class ApiConflictErrorDto extends ApiErrorResponseDto {}
export class ApiInternalServerErrorDto extends ApiErrorResponseDto {}

export class ApiValidationErrorResponseDto {
  @ApiPropertyOptional({ example: 422 })
  statusCode?: number;

  @ApiProperty({ example: 'Validation failed' })
  error!: string;

  @ApiProperty({ type: [ApiValidationIssueDto] })
  issues!: ApiValidationIssueDto[];
}

