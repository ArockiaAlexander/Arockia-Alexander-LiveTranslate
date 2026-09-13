export default function handler(_req: any, res: any) {
  try {
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
  } catch (error) {
    console.error('[health-check]', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    res.status(500).json({ status: 'error' });
  }
}