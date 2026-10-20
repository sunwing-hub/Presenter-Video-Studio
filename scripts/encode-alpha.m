#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>
#import <ImageIO/ImageIO.h>
#import <CoreVideo/CoreVideo.h>
#include <stdio.h>

// Length-prefixed PNG frames on stdin. No video/audio source is read by this encoder.
int main(int argc, const char *argv[]) { @autoreleasepool {
 if (argc != 6) { fprintf(stderr,"output width height fps frames required\n"); return 2; }
 int width=atoi(argv[2]),height=atoi(argv[3]),fps=atoi(argv[4]),frames=atoi(argv[5]);
 if(width<2||height<2||fps<1||frames<1) return 2;
 NSError *error=nil;
 AVAssetWriter *writer=[[AVAssetWriter alloc] initWithURL:[NSURL fileURLWithPath:@(argv[1])] fileType:AVFileTypeQuickTimeMovie error:&error];
 AVAssetWriterInput *input=[AVAssetWriterInput assetWriterInputWithMediaType:AVMediaTypeVideo outputSettings:@{AVVideoCodecKey:AVVideoCodecTypeAppleProRes4444,AVVideoWidthKey:@(width),AVVideoHeightKey:@(height)}];
 AVAssetWriterInputPixelBufferAdaptor *adapter=[AVAssetWriterInputPixelBufferAdaptor assetWriterInputPixelBufferAdaptorWithAssetWriterInput:input sourcePixelBufferAttributes:@{(id)kCVPixelBufferPixelFormatTypeKey:@(kCVPixelFormatType_32BGRA),(id)kCVPixelBufferWidthKey:@(width),(id)kCVPixelBufferHeightKey:@(height),(id)kCVPixelBufferCGImageCompatibilityKey:@YES,(id)kCVPixelBufferCGBitmapContextCompatibilityKey:@YES}];
 if(!writer || ![writer canAddInput:input]) { fprintf(stderr,"Cannot create ProRes writer\n");return 3; }
 [writer addInput:input];
 if(![writer startWriting]) { fprintf(stderr,"%s\n",writer.error.description.UTF8String);return 3; }
 [writer startSessionAtSourceTime:kCMTimeZero];
 for(int frame=0;frame<frames;frame++) { @autoreleasepool {
  uint32_t beLength;
  if(fread(&beLength,4,1,stdin)!=1) { fprintf(stderr,"Incomplete frame stream\n");return 4; }
  uint32_t length=CFSwapInt32BigToHost(beLength);
  if(length==0 || length>100*1024*1024) return 4;
  NSMutableData *data=[NSMutableData dataWithLength:length];
  if(fread(data.mutableBytes,1,length,stdin)!=length) return 4;
  CGImageSourceRef source=CGImageSourceCreateWithData((__bridge CFDataRef)data,NULL);
  CGImageRef image=source?CGImageSourceCreateImageAtIndex(source,0,NULL):NULL;
  if(!image || CGImageGetWidth(image)!=width || CGImageGetHeight(image)!=height) { fprintf(stderr,"Invalid frame dimensions\n");return 4; }
  while(!input.readyForMoreMediaData) { if(writer.status==AVAssetWriterStatusFailed) { fprintf(stderr,"%s\n",writer.error.description.UTF8String);return 5; } [NSThread sleepForTimeInterval:.005]; }
  CVPixelBufferRef buffer=NULL;
  CVPixelBufferPoolCreatePixelBuffer(NULL,adapter.pixelBufferPool,&buffer);
  if(!buffer) return 5;
  CVPixelBufferLockBaseAddress(buffer,0);
  CGColorSpaceRef color=CGColorSpaceCreateWithName(kCGColorSpaceSRGB);
  CGContextRef context=CGBitmapContextCreate(CVPixelBufferGetBaseAddress(buffer),width,height,8,CVPixelBufferGetBytesPerRow(buffer),color,kCGBitmapByteOrder32Little|kCGImageAlphaPremultipliedFirst);
  CGContextClearRect(context,CGRectMake(0,0,width,height));
  CGContextDrawImage(context,CGRectMake(0,0,width,height),image);
  CGContextRelease(context);CGColorSpaceRelease(color);
  CVPixelBufferUnlockBaseAddress(buffer,0);
  BOOL ok=[adapter appendPixelBuffer:buffer withPresentationTime:CMTimeMake(frame,fps)];
  CVPixelBufferRelease(buffer);CGImageRelease(image);CFRelease(source);
  if(!ok) { fprintf(stderr,"%s\n",writer.error.description.UTF8String);return 5; }
 }}
 [input markAsFinished];
 [writer endSessionAtSourceTime:CMTimeMake(frames,fps)];
 dispatch_semaphore_t done=dispatch_semaphore_create(0);
 [writer finishWritingWithCompletionHandler:^{dispatch_semaphore_signal(done);}];
 dispatch_semaphore_wait(done,DISPATCH_TIME_FOREVER);
 if(writer.status!=AVAssetWriterStatusCompleted) { fprintf(stderr,"%s\n",writer.error.description.UTF8String);return 6; }
 } return 0; }
