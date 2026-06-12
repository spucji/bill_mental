#!/bin/bash
# 安装 sherpa-onnx 到项目虚拟环境
# 注意: 必须同时安装 sherpa-onnx + sherpa-onnx-bin（后者包含原生库和 CLI）
# 国内用户从 hf-mirror 下载，不走 HuggingFace
#
# 用法:
#   bash scripts/download-sherpa.sh

set -e
cd "$(dirname "$0")/.."

VENV=".venv"

echo "创建 Python 虚拟环境: $VENV"
python3 -m venv "$VENV"

echo "安装 sherpa-onnx + 原生库 (国内镜像) ..."

# 优先: 国内镜像 (hf-mirror.com)
if "$VENV/bin/pip" install --verbose \
    sherpa_onnx_bin sherpa_onnx_core sherpa_onnx \
    --no-index \
    -f https://k2-fsa.github.io/sherpa/onnx/cpu-cn.html 2>/dev/null; then
  echo "✓ 从国内镜像安装成功"
else
  echo "镜像失败，尝试直接安装 ..."
  "$VENV/bin/pip" install sherpa-onnx sherpa-onnx-bin 2>/dev/null \
    || "$VENV/bin/pip" install --break-system-packages sherpa-onnx sherpa-onnx-bin 2>/dev/null \
    || { echo "安装失败，请手动执行:"; echo "  $VENV/bin/pip install --verbose sherpa_onnx_bin sherpa_onnx_core sherpa_onnx --no-index -f https://k2-fsa.github.io/sherpa/onnx/cpu-cn.html"; exit 1; }
fi

echo ""
echo "验证:"
"$VENV/bin/python3" -c "import sherpa_onnx; print('✓ Python API:', sherpa_onnx.__file__)"
"$VENV/bin/sherpa-onnx" --help 2>&1 | head -3 || true

echo ""
echo "✓ 语音识别依赖已就绪。"
echo "下一步: bash scripts/download-model.sh"
