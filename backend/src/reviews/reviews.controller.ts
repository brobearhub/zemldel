import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiOkResponse, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { InternalAuthService } from '../auth/internal-auth.service';
import { ApiStandardErrors } from '../common/swagger/api-standard-errors.decorator';
import { CreateReviewDto, ReplyReviewDto, ReviewDto, ReviewListDto } from './dto/review.dto';
import { ReviewsService } from './reviews.service';

@ApiStandardErrors()
@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(
    private readonly reviews: ReviewsService,
    private readonly internalAuth: InternalAuthService,
  ) {}

  @Get('services/:serviceId/reviews')
  @ApiParam({ name: 'serviceId', type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiOkResponse({ type: ReviewListDto })
  listForService(
    @Param('serviceId') serviceId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.reviews.listForService(serviceId, {
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }

  @Get('providers/:providerId/reviews')
  @ApiParam({ name: 'providerId', type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiOkResponse({ type: ReviewListDto })
  listForProvider(
    @Param('providerId') providerId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.reviews.listForProvider(providerId, {
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }

  @Get('requests/:requestId/reviews')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: [ReviewDto] })
  listForRequest(@Req() request: Request, @Param('requestId') requestId: string) {
    return this.reviews.listForRequest({
      actorUserId: this.internalAuth.getUserIdFromRequest(request),
      requestId,
    });
  }

  @Post('requests/:requestId/reviews')
  @ApiParam({ name: 'requestId', type: String })
  @ApiOkResponse({ type: ReviewDto })
  createReview(
    @Req() request: Request,
    @Param('requestId') requestId: string,
    @Body() body: CreateReviewDto,
  ) {
    return this.reviews.createReview({
      actorUserId: this.internalAuth.getUserIdFromRequest(request),
      requestId,
      rating: body.rating,
      text: body.text,
    });
  }

  @Post('reviews/:reviewId/reply')
  @ApiParam({ name: 'reviewId', type: String })
  @ApiOkResponse({ type: ReviewDto })
  reply(
    @Req() request: Request,
    @Param('reviewId') reviewId: string,
    @Body() body: ReplyReviewDto,
  ) {
    return this.reviews.reply({
      actorUserId: this.internalAuth.getUserIdFromRequest(request),
      reviewId,
      text: body.text,
    });
  }
}
