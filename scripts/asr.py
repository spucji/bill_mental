#!/usr/bin/env python3
"""sherpa-onnx SenseVoice 离线语音识别 (v1.13 API)
用法: python3 asr.py /path/to/model_dir /path/to/audio.wav
输出: 识别的文本（stdout）
"""
import sys
import os
import wave
import array


def read_wav(wav_file):
    """读取 WAV 文件，返回 (sample_rate, float32 samples list)"""
    with wave.open(wav_file, "rb") as wf:
        assert wf.getsampwidth() == 2, "需要 16-bit PCM WAV"
        assert wf.getnchannels() == 1, "需要单声道 WAV"
        sr = wf.getframerate()
        n = wf.getnframes()
        raw = wf.readframes(n)
        arr = array.array("h", raw)
        samples = [float(v) / 32768.0 for v in arr]
        return sr, samples


def main():
    if len(sys.argv) < 3:
        print("用法: asr.py <model_dir> <wav_file>", file=sys.stderr)
        sys.exit(1)

    model_dir = sys.argv[1]
    wav_file = sys.argv[2]

    if not os.path.isfile(wav_file):
        print(f"WAV 文件不存在: {wav_file}", file=sys.stderr)
        sys.exit(1)

    model_path = os.path.join(model_dir, "model.int8.onnx")
    tokens_path = os.path.join(model_dir, "tokens.txt")

    for f, label in [(model_path, "模型"), (tokens_path, "tokens")]:
        if not os.path.isfile(f):
            print(f"{label}文件不存在: {f}", file=sys.stderr)
            sys.exit(1)

    try:
        import sherpa_onnx
    except ImportError:
        print("sherpa-onnx 未安装，请运行: bash scripts/download-sherpa.sh", file=sys.stderr)
        sys.exit(1)

    sample_rate, samples = read_wav(wav_file)

    recognizer = sherpa_onnx.OfflineRecognizer.from_sense_voice(
        model=model_path,
        tokens=tokens_path,
        language="zh",
        use_itn=True,
    )

    stream = recognizer.create_stream()
    stream.accept_waveform(sample_rate, samples)
    recognizer.decode_stream(stream)
    text = stream.result.text

    if not text:
        print("[未识别到语音]", file=sys.stderr)
        sys.exit(2)

    print(text)


if __name__ == "__main__":
    main()
