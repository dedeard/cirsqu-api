import { IsNotEmpty, IsString, IsEnum, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(3000)
  body: string;

  @IsString()
  @IsNotEmpty()
  targetId: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['answer', 'episode', 'reply'])
  targetType: 'answer' | 'episode' | 'reply';
}
