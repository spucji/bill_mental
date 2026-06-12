#!/bin/bash
# 下载 sherpa-onnx SenseVoice 中文模型 (int8, ~40MB)
# 来源: https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models
#
# 用法:
#   bash scripts/download-model.sh [输出目录]
#   默认输出: ./models/sense-voice

set -e

MODEL_DIR="${1:-./models/sense-voice}"
MODEL_TGZ="sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09.tar.bz2"
BASE_PATH="k2-fsa/sherpa-onnx/releases/download/asr-models"

# 下载源（按优先级）
URLS=(
  "https://github.com/${BASE_PATH}/${MODEL_TGZ}"
  "https://ghproxy.com/https://github.com/${BASE_PATH}/${MODEL_TGZ}"
  "https://mirror.ghproxy.com/https://github.com/${BASE_PATH}/${MODEL_TGZ}"
)

mkdir -p "$MODEL_DIR"

download() {
  local url="$1"
  echo "尝试: $url"
  if curl -fSL --connect-timeout 10 --max-time 180 -o /tmp/"$MODEL_TGZ" "$url" 2>/dev/null; then
    return 0
  fi
  return 1
}

SUCCESS=false
for url in "${URLS[@]}"; do
  if download "$url"; then
    SUCCESS=true
    break
  fi
  echo "  → 失败，尝试下一个源"
done

if [ "$SUCCESS" = false ]; then
  echo ""
  echo "=============================================="
  echo "  自动下载失败。请手动下载并解压："
  echo ""
  echo "  1. 浏览器打开（需要代理）:"
  echo "     ${URLS[0]}"
  echo ""
  echo "  2. 保存到任意位置后执行:"
  echo "     tar -xjf $MODEL_TGZ -C $MODEL_DIR --strip-components=1"
  echo ""
  echo "  3. 确认文件存在:"
  echo "     $MODEL_DIR/model.int8.onnx"
  echo "     $MODEL_DIR/tokens.txt"
  echo "=============================================="
  exit 1
fi

tar -xjf /tmp/"$MODEL_TGZ" -C "$MODEL_DIR" --strip-components=1
rm -f /tmp/"$MODEL_TGZ"

echo ""
echo "✓ 模型下载完成: $MODEL_DIR"
echo "  model.int8.onnx  ($(du -h "$MODEL_DIR/model.int8.onnx" | cut -f1))"
echo "  tokens.txt       ($(du -h "$MODEL_DIR/tokens.txt" | cut -f1))"
