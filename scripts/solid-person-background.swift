import AppKit
import CoreImage
import Foundation
import Vision

guard CommandLine.arguments.count == 4 else {
  fputs("Usage: solid-person-background <input> <output> <hex-color>\n", stderr)
  exit(2)
}

let inputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let outputURL = URL(fileURLWithPath: CommandLine.arguments[2])
let hex = CommandLine.arguments[3].trimmingCharacters(in: CharacterSet(charactersIn: "#"))

guard
  hex.count == 6,
  let red = UInt8(hex.prefix(2), radix: 16),
  let green = UInt8(hex.dropFirst(2).prefix(2), radix: 16),
  let blue = UInt8(hex.suffix(2), radix: 16),
  let source = CIImage(contentsOf: inputURL)
else {
  fputs("Invalid input image or color.\n", stderr)
  exit(2)
}

let request = VNGeneratePersonSegmentationRequest()
request.qualityLevel = .accurate
request.outputPixelFormat = kCVPixelFormatType_OneComponent8

let handler = VNImageRequestHandler(ciImage: source, options: [:])
try handler.perform([request])

guard let result = request.results?.first else {
  fputs("No person mask was generated.\n", stderr)
  exit(1)
}

let rawMask = CIImage(cvPixelBuffer: result.pixelBuffer)
let scaledMask = rawMask.transformed(
  by: CGAffineTransform(
    scaleX: source.extent.width / rawMask.extent.width,
    y: source.extent.height / rawMask.extent.height
  )
)

let softenedMask = scaledMask
  .clampedToExtent()
  .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: 0.65])
  .cropped(to: source.extent)

let solidColor = CIColor(
  red: CGFloat(red) / 255,
  green: CGFloat(green) / 255,
  blue: CGFloat(blue) / 255,
  alpha: 1
)
let background = CIImage(color: solidColor).cropped(to: source.extent)

guard let blend = CIFilter(name: "CIBlendWithMask") else {
  fputs("Unable to create image compositor.\n", stderr)
  exit(1)
}

blend.setValue(source, forKey: kCIInputImageKey)
blend.setValue(background, forKey: kCIInputBackgroundImageKey)
blend.setValue(softenedMask, forKey: kCIInputMaskImageKey)

guard let output = blend.outputImage?.cropped(to: source.extent) else {
  fputs("Unable to composite image.\n", stderr)
  exit(1)
}

let context = CIContext(options: [.useSoftwareRenderer: false])
let colorSpace = CGColorSpace(name: CGColorSpace.sRGB)!
try context.writeJPEGRepresentation(
  of: output,
  to: outputURL,
  colorSpace: colorSpace,
  options: [kCGImageDestinationLossyCompressionQuality as CIImageRepresentationOption: 0.96]
)
