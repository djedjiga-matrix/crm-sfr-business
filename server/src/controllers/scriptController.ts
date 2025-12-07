import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/authMiddleware';

// Default scripts to seed if none exist
const defaultScriptsData = [
    {
        name: 'Premier appel',
        status: 'NEW' as const,
        isDefault: true,
        sections: [
            {
                title: '👋 Introduction',
                content: `Bonjour, je suis [VOTRE NOM] de SFR Business.

Je me permets de vous appeler concernant {companyName}.

Êtes-vous bien le responsable des télécommunications de l'entreprise ?`,
                type: 'INTRO' as const,
                order: 0
            },
            {
                title: '💼 Pitch principal',
                content: `Super ! Je vous contacte car nous accompagnons les entreprises comme la vôtre dans l'optimisation de leurs coûts télécoms.

Nous proposons actuellement :
• Des forfaits mobiles professionnels à partir de 19€/mois
• La fibre entreprise avec garantie de débit
• Des solutions de téléphonie IP

Est-ce que vous avez quelques minutes pour en discuter ?`,
                type: 'PITCH' as const,
                order: 1
            },
            {
                title: '📅 Proposition RDV',
                content: `Pour vous présenter nos solutions en détail et vous faire une proposition personnalisée, je vous propose un rendez-vous avec notre conseiller commercial.

Il pourra analyser vos besoins spécifiques et vous proposer les meilleures offres.

Quel jour vous conviendrait le mieux la semaine prochaine ?`,
                type: 'CLOSING' as const,
                order: 2
            }
        ]
    },
    {
        name: 'Rappel client',
        status: 'CALLBACK_LATER' as const,
        isDefault: true,
        sections: [
            {
                title: '👋 Introduction rappel',
                content: `Bonjour, [VOTRE NOM] de SFR Business.

Nous nous étions parlé il y a quelques temps concernant vos solutions télécoms pour {companyName}.

Vous m'aviez demandé de vous rappeler. Est-ce que c'est un bon moment ?`,
                type: 'INTRO' as const,
                order: 0
            },
            {
                title: '📝 Rappel du contexte',
                content: `Lors de notre dernier échange, vous m'aviez mentionné que :

• [Récap de la situation précédente]
• [Éventuelles objections mentionnées]

Avez-vous eu le temps d'y réfléchir ?`,
                type: 'PITCH' as const,
                order: 1
            },
            {
                title: '📅 Reprendre la proposition',
                content: `Je vous propose toujours ce rendez-vous avec notre conseiller.

C'est vraiment l'occasion de faire le point sur vos contrats actuels et de voir les économies possibles.

Quand seriez-vous disponible ?`,
                type: 'CLOSING' as const,
                order: 2
            }
        ]
    },
    {
        name: 'Relance NRP',
        status: 'NRP' as const,
        isDefault: true,
        sections: [
            {
                title: '👋 Introduction insistante',
                content: `Bonjour, [VOTRE NOM] de SFR Business.

J'essaie de joindre le responsable télécoms de {companyName}.

Serait-il possible de me le passer ou d'avoir ses disponibilités pour le rappeler ?`,
                type: 'INTRO' as const,
                order: 0
            },
            {
                title: '📞 Si standard/accueil',
                content: `C'est concernant vos contrats de téléphonie professionnelle.

Pouvez-vous me renseigner sur les meilleurs créneaux pour joindre M./Mme [NOM] ?

Ou peut-être pourriez-vous lui transmettre mon message ?`,
                type: 'INFO' as const,
                order: 1
            }
        ]
    },
    {
        name: 'Suivi après RDV',
        status: 'FOLLOW_UP' as const,
        isDefault: true,
        sections: [
            {
                title: '👋 Prise de nouvelles',
                content: `Bonjour, [VOTRE NOM] de SFR Business.

Je fais suite au rendez-vous que vous avez eu avec notre conseiller.

Comment s'est passée la présentation ?`,
                type: 'INTRO' as const,
                order: 0
            },
            {
                title: '💬 Recueillir feedback',
                content: `Avez-vous pu étudier notre proposition ?

Y a-t-il des points que vous aimeriez éclaircir ?

Quelles sont vos prochaines étapes en interne ?`,
                type: 'PITCH' as const,
                order: 1
            }
        ]
    }
];

const defaultObjections = [
    {
        objection: "On est déjà chez un concurrent",
        response: "Je comprends tout à fait. C'est justement l'occasion de comparer. Nous faisons régulièrement économiser 20 à 30% à nos clients qui viennent de la concurrence. Un audit gratuit ne vous engage à rien.",
        isGlobal: true,
        order: 0
    },
    {
        objection: "Pas intéressé / Pas le temps",
        response: "Je comprends que vous soyez occupé. C'est justement pour vous faire gagner du temps que je propose ce rendez-vous. Notre conseiller vient directement chez vous et l'échange dure seulement 30 minutes.",
        isGlobal: true,
        order: 1
    },
    {
        objection: "Envoyez-moi un email",
        response: "Bien sûr, je peux vous envoyer notre documentation. Mais pour vous proposer une offre adaptée, j'aurais besoin de quelques informations. Combien de lignes mobiles avez-vous actuellement ?",
        isGlobal: true,
        order: 2
    },
    {
        objection: "C'est trop cher",
        response: "Je comprends votre préoccupation sur le budget. C'est pourquoi nous proposons une étude personnalisée. Souvent, nos clients réalisent des économies dès le premier mois.",
        isGlobal: true,
        order: 3
    },
    {
        objection: "Je dois en parler à mon associé/direction",
        response: "Tout à fait normal. C'est pour cela que notre conseiller peut venir rencontrer l'ensemble des décideurs. Quand pensez-vous pouvoir en discuter avec eux ?",
        isGlobal: true,
        order: 4
    }
];

// Get all scripts
export const getScripts = async (req: AuthRequest, res: Response) => {
    try {
        const scripts = await prisma.callScript.findMany({
            include: {
                sections: { orderBy: { order: 'asc' } },
                objections: { orderBy: { order: 'asc' } }
            },
            orderBy: { status: 'asc' }
        });

        res.json(scripts);
    } catch (error) {
        console.error('Error fetching scripts:', error);
        res.status(500).json({ message: 'Error fetching scripts' });
    }
};

// Get script by status (for preview mode)
export const getScriptByStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { status } = req.params;

        let script = await prisma.callScript.findFirst({
            where: {
                status: status as any,
                isDefault: true,
                isActive: true
            },
            include: {
                sections: { orderBy: { order: 'asc' } },
                objections: { orderBy: { order: 'asc' } }
            }
        });

        // Get global objections
        const globalObjections = await prisma.callScriptObjection.findMany({
            where: { isGlobal: true },
            orderBy: { order: 'asc' }
        });

        if (script) {
            // Merge global objections with script-specific ones
            const allObjections = [...(script.objections || []), ...globalObjections];
            res.json({ ...script, objections: allObjections });
        } else {
            // Return null if no script exists for this status
            res.json({ objections: globalObjections });
        }
    } catch (error) {
        console.error('Error fetching script by status:', error);
        res.status(500).json({ message: 'Error fetching script' });
    }
};

// Create or update a script
export const upsertScript = async (req: AuthRequest, res: Response) => {
    try {
        const { id, name, status, isDefault, isActive, sections, objections } = req.body;

        // If setting as default, unset other defaults for this status
        if (isDefault) {
            await prisma.callScript.updateMany({
                where: { status, isDefault: true },
                data: { isDefault: false }
            });
        }

        let script;
        if (id) {
            // Update existing script
            script = await prisma.callScript.update({
                where: { id },
                data: {
                    name,
                    status,
                    isDefault: isDefault ?? false,
                    isActive: isActive ?? true
                }
            });

            // Delete old sections and create new ones
            await prisma.callScriptSection.deleteMany({ where: { scriptId: id } });
            if (sections && sections.length > 0) {
                await prisma.callScriptSection.createMany({
                    data: sections.map((s: any, index: number) => ({
                        scriptId: id,
                        title: s.title,
                        content: s.content,
                        type: s.type || 'INFO',
                        order: s.order ?? index
                    }))
                });
            }

            // Delete old script-specific objections and create new ones
            await prisma.callScriptObjection.deleteMany({
                where: { scriptId: id, isGlobal: false }
            });
            if (objections && objections.length > 0) {
                const scriptObjections = objections.filter((o: any) => !o.isGlobal);
                if (scriptObjections.length > 0) {
                    await prisma.callScriptObjection.createMany({
                        data: scriptObjections.map((o: any, index: number) => ({
                            scriptId: id,
                            objection: o.objection,
                            response: o.response,
                            order: o.order ?? index,
                            isGlobal: false
                        }))
                    });
                }
            }
        } else {
            // Create new script
            script = await prisma.callScript.create({
                data: {
                    name,
                    status,
                    isDefault: isDefault ?? false,
                    isActive: isActive ?? true,
                    sections: {
                        create: (sections || []).map((s: any, index: number) => ({
                            title: s.title,
                            content: s.content,
                            type: s.type || 'INFO',
                            order: s.order ?? index
                        }))
                    },
                    objections: {
                        create: (objections || []).filter((o: any) => !o.isGlobal).map((o: any, index: number) => ({
                            objection: o.objection,
                            response: o.response,
                            order: o.order ?? index,
                            isGlobal: false
                        }))
                    }
                }
            });
        }

        // Fetch updated script with relations
        const updatedScript = await prisma.callScript.findUnique({
            where: { id: script.id },
            include: {
                sections: { orderBy: { order: 'asc' } },
                objections: { orderBy: { order: 'asc' } }
            }
        });

        res.json(updatedScript);
    } catch (error) {
        console.error('Error upserting script:', error);
        res.status(500).json({ message: 'Error saving script', error: String(error) });
    }
};

// Delete a script
export const deleteScript = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        await prisma.callScript.delete({ where: { id } });

        res.json({ message: 'Script deleted successfully' });
    } catch (error) {
        console.error('Error deleting script:', error);
        res.status(500).json({ message: 'Error deleting script' });
    }
};

// Get global objections
export const getGlobalObjections = async (req: AuthRequest, res: Response) => {
    try {
        const objections = await prisma.callScriptObjection.findMany({
            where: { isGlobal: true },
            orderBy: { order: 'asc' }
        });

        res.json(objections);
    } catch (error) {
        console.error('Error fetching global objections:', error);
        res.status(500).json({ message: 'Error fetching objections' });
    }
};

// Update global objections
export const updateGlobalObjections = async (req: AuthRequest, res: Response) => {
    try {
        const { objections } = req.body;

        // Delete all existing global objections
        await prisma.callScriptObjection.deleteMany({ where: { isGlobal: true } });

        // Create new global objections
        if (objections && objections.length > 0) {
            await prisma.callScriptObjection.createMany({
                data: objections.map((o: any, index: number) => ({
                    objection: o.objection,
                    response: o.response,
                    order: o.order ?? index,
                    isGlobal: true
                }))
            });
        }

        // Fetch updated objections
        const updatedObjections = await prisma.callScriptObjection.findMany({
            where: { isGlobal: true },
            orderBy: { order: 'asc' }
        });

        res.json(updatedObjections);
    } catch (error) {
        console.error('Error updating global objections:', error);
        res.status(500).json({ message: 'Error updating objections' });
    }
};

// Seed default scripts if none exist
export const seedDefaultScripts = async (req: AuthRequest, res: Response) => {
    try {
        const existingScripts = await prisma.callScript.count();

        if (existingScripts > 0) {
            return res.json({ message: 'Scripts already exist', seeded: false });
        }

        // Create default scripts
        for (const scriptData of defaultScriptsData) {
            await prisma.callScript.create({
                data: {
                    name: scriptData.name,
                    status: scriptData.status,
                    isDefault: scriptData.isDefault,
                    sections: {
                        create: scriptData.sections
                    }
                }
            });
        }

        // Create global objections
        await prisma.callScriptObjection.createMany({
            data: defaultObjections
        });

        res.json({ message: 'Default scripts created successfully', seeded: true });
    } catch (error) {
        console.error('Error seeding scripts:', error);
        res.status(500).json({ message: 'Error seeding scripts', error: String(error) });
    }
};
