import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  ApiBadRequestErrorDto,
  ApiConflictErrorDto,
  ApiForbiddenErrorDto,
  ApiInternalServerErrorDto,
  ApiNotFoundErrorDto,
  ApiUnauthorizedErrorDto,
  ApiValidationErrorResponseDto,
} from '../dto/api-error-response.dto';

export function ApiStandardErrors() {
  return applyDecorators(
    ApiBadRequestResponse({ type: ApiBadRequestErrorDto, description: 'Bad Request' }),
    ApiUnauthorizedResponse({ type: ApiUnauthorizedErrorDto, description: 'Unauthorized' }),
    ApiForbiddenResponse({ type: ApiForbiddenErrorDto, description: 'Forbidden' }),
    ApiNotFoundResponse({ type: ApiNotFoundErrorDto, description: 'Not Found' }),
    ApiConflictResponse({ type: ApiConflictErrorDto, description: 'Conflict' }),
    ApiUnprocessableEntityResponse({
      type: ApiValidationErrorResponseDto,
      description: 'Validation failed',
    }),
    ApiInternalServerErrorResponse({
      type: ApiInternalServerErrorDto,
      description: 'Internal Server Error',
    }),
  );
}

