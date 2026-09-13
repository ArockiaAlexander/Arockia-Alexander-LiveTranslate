export default function handler(_req: any, res: any) {
  const environmentKeys = Object.keys(process.env).filter((key) => {
    const normalizedKey = key.toLowerCase();
    return normalizedKey.includes('sarvam') || normalizedKey.includes('gemini');
  });

  res.status(200).json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    hasSarvamKey: Boolean(
      process.env.SARVAM_API_KEY ||
        process.env.SARVAM_KEY ||
        process.env.SARVAM ||
        process.env.SARVAM_TOKEN
    ),
    detectedEnvKeys: environmentKeys,
    timestamp: Date.now(),
  });
}