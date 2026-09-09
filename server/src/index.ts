import { buildApp } from './app.js';
import { env, swaggerEnabled } from './config/env.js';
import { disconnectPrisma, prisma } from './lib/prisma.js';

async function main(): Promise<void> {
  const app = await buildApp();

  try {
    await prisma.$connect();
    app.log.info('Base de données connectée');
  } catch (error) {
    app.log.error({ err: error }, 'Impossible de joindre la base de données');
    process.exit(1);
  }

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Signal ${signal} reçu, arrêt en cours...`);
    try {
      await app.close();
      await disconnectPrisma();
      process.exit(0);
    } catch (error) {
      app.log.error({ err: error }, "Erreur pendant l'arrêt");
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    app.log.error({ err: reason }, 'Promesse rejetée non gérée');
  });

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`API Nyokah démarrée sur ${env.API_URL}`);
    if (swaggerEnabled) app.log.info(`Documentation disponible sur ${env.API_URL}/docs`);
  } catch (error) {
    app.log.error({ err: error }, 'Échec du démarrage du serveur');
    process.exit(1);
  }
}

void main();
