import { AuthGuard } from '@nestjs/passport';
import { Controller, Post, Put, Req, Body, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { UserRecord } from 'firebase-admin/lib/auth/user-record';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ValidateImagePipe } from '../pipes/validate-image.pipe';

@UseGuards(AuthGuard('cookie-or-bearer'))
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  create(@Req() { user }: { user: UserRecord }, @Body() createProfileDto: CreateProfileDto) {
    return this.profilesService.create(user, createProfileDto);
  }

  @Put()
  @UseInterceptors(FileInterceptor('avatar'))
  update(
    @Req() { user }: { user: UserRecord },
    @UploadedFile(new ValidateImagePipe({ required: false })) file,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profilesService.update(user, updateProfileDto, file?.buffer);
  }
}