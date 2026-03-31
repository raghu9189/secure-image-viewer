#!/bin/bash

# Set input and output directories
INPUT_DIR="images"
OUTPUT_DIR="images/com"
QUALITY=5  # Quality level for compression (1-31, lower is better quality)

# write shell script to compress images using ffmpeg
mkdir -p "$OUTPUT_DIR"  
for img in "$INPUT_DIR"/*.{jpg,jpeg,png}; do
    if [ -f "$img" ]; then
        filename=$(basename "$img")
        output_img="$OUTPUT_DIR/$filename"
        ffmpeg -i "$img" -q:v $QUALITY "$output_img".jpg -y
        echo "Compressed $img to $output_img".jpg
    fi
done

# ffmpeg -i input_image.jpg -q:v 5 output_image.jpg