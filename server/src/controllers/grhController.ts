import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import { format, differenceInSeconds, startOfDay, endOfDay, eachDayOfInterval, isWeekend, parseISO } from 'date-fns';

const prisma = new PrismaClient();

export const generateGrhExport = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, userIds, teamId, role, format: exportFormat } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date are required' });
        }

        const start = startOfDay(parseISO(startDate));
        const end = endOfDay(parseISO(endDate));

        // Build user filter
        const userFilter: any = {};
        if (userIds && userIds.length > 0) {
            userFilter.id = { in: userIds };
        }
        if (role) {
            userFilter.role = role;
        }
        // If teamId is provided, we would filter by team membership (assuming logic exists, currently using basic filters)

        const users = await prisma.user.findMany({
            where: userFilter,
            include: {
                sessions: {
                    where: {
                        loginTime: {
                            gte: start,
                            lte: end
                        }
                    },
                    orderBy: { loginTime: 'asc' }
                },
                pauses: {
                    where: {
                        startTime: {
                            gte: start,
                            lte: end
                        }
                    }
                },
                dailyStats: {
                    where: {
                        date: {
                            gte: start,
                            lte: end
                        }
                    }
                }
            }
        });

        if (exportFormat === 'json') {
            return res.json(users);
        }

        if (exportFormat === 'excel') {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'CRM System';
            workbook.created = new Date();

            // --- Tab 1: Vue d'ensemble ---
            const overviewSheet = workbook.addWorksheet("Vue d'ensemble");
            overviewSheet.columns = [
                { header: 'Nom', key: 'name', width: 20 },
                { header: 'Rôle', key: 'role', width: 15 },
                { header: 'J.Présents', key: 'daysPresent', width: 12 },
                { header: 'J.Absents', key: 'daysAbsent', width: 12 },
                { header: 'H.Travail', key: 'workHours', width: 15 },
                { header: 'H.Production', key: 'prodHours', width: 15 },
                { header: 'Pauses', key: 'pauseHours', width: 15 },
                { header: 'H.Supp.', key: 'overtime', width: 12 },
            ];

            // Style header
            overviewSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            overviewSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };

            // --- Tab 2: Détail journalier ---
            const dailySheet = workbook.addWorksheet("Détail journalier");
            dailySheet.columns = [
                { header: 'Nom', key: 'name', width: 20 },
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Arrivée', key: 'arrival', width: 10 },
                { header: 'Départ', key: 'departure', width: 10 },
                { header: 'H.Travail', key: 'workTime', width: 12 },
                { header: 'Pauses', key: 'pauseTime', width: 12 },
                { header: 'H.Prod.', key: 'prodTime', width: 12 },
                { header: 'H.Supp.', key: 'overtime', width: 10 },
                { header: 'Statut', key: 'status', width: 15 },
            ];
            dailySheet.getRow(1).font = { bold: true };

            // --- Tab 3: Détail des pauses ---
            const breaksSheet = workbook.addWorksheet("Détail des pauses");
            breaksSheet.columns = [
                { header: 'Nom', key: 'name', width: 20 },
                { header: 'Date', key: 'date', width: 15 },
                { header: 'Type', key: 'type', width: 15 },
                { header: 'Début', key: 'start', width: 10 },
                { header: 'Fin', key: 'end', width: 10 },
                { header: 'Durée (min)', key: 'duration', width: 12 },
            ];
            breaksSheet.getRow(1).font = { bold: true };

            const daysInPeriod = eachDayOfInterval({ start, end });
            const workingDays = daysInPeriod.filter(day => !isWeekend(day)).length;

            for (const user of users) {
                let totalWorkSeconds = 0;
                let totalPauseSeconds = 0;
                let daysPresent = 0;
                let totalOvertimeSeconds = 0;

                // Process daily stats
                for (const day of daysInPeriod as Date[]) {
                    const dayStart = startOfDay(day);
                    const dayEnd = endOfDay(day);

                    const sessions = user.sessions.filter(s => s.loginTime >= dayStart && s.loginTime <= dayEnd);
                    const pauses = user.pauses.filter(p => p.startTime >= dayStart && p.startTime <= dayEnd);

                    if (sessions.length > 0) {
                        daysPresent++;

                        // Calculate daily totals
                        const firstLogin = sessions[0].loginTime;
                        const lastLogout = sessions[sessions.length - 1].logoutTime || new Date(); // If currently logged in, use now

                        // Simple calculation: Time between first login and last logout
                        // A more accurate one would sum up all session durations
                        let dailyWorkSeconds = 0;
                        sessions.forEach(s => {
                            const sEnd = s.logoutTime || new Date();
                            dailyWorkSeconds += differenceInSeconds(sEnd, s.loginTime);
                        });

                        let dailyPauseSeconds = 0;
                        pauses.forEach(p => {
                            const pEnd = p.endTime || new Date();
                            dailyPauseSeconds += differenceInSeconds(pEnd, p.startTime);
                        });

                        const dailyProdSeconds = dailyWorkSeconds - dailyPauseSeconds;
                        const dailyOvertime = Math.max(0, dailyProdSeconds - (7.5 * 3600)); // 7h30 standard

                        totalWorkSeconds += dailyWorkSeconds;
                        totalPauseSeconds += dailyPauseSeconds;
                        totalOvertimeSeconds += dailyOvertime;

                        // Add to Daily Sheet
                        dailySheet.addRow({
                            name: user.name,
                            date: format(day, 'dd/MM/yyyy'),
                            arrival: format(firstLogin, 'HH:mm'),
                            departure: format(lastLogout, 'HH:mm'),
                            workTime: formatDuration(dailyWorkSeconds),
                            pauseTime: formatDuration(dailyPauseSeconds),
                            prodTime: formatDuration(dailyProdSeconds),
                            overtime: formatDuration(dailyOvertime),
                            status: dailyOvertime > 0 ? 'Heures Sup.' : 'Normal'
                        });

                        // Add to Breaks Sheet
                        pauses.forEach(p => {
                            const pEnd = p.endTime || new Date();
                            const duration = differenceInSeconds(pEnd, p.startTime);
                            breaksSheet.addRow({
                                name: user.name,
                                date: format(day, 'dd/MM/yyyy'),
                                type: p.type,
                                start: format(p.startTime, 'HH:mm'),
                                end: format(pEnd, 'HH:mm'),
                                duration: Math.round(duration / 60)
                            });
                        });

                    } else if (!isWeekend(day)) {
                        // Absent on a working day
                        dailySheet.addRow({
                            name: user.name,
                            date: format(day, 'dd/MM/yyyy'),
                            arrival: '-',
                            departure: '-',
                            workTime: '-',
                            pauseTime: '-',
                            prodTime: '-',
                            overtime: '-',
                            status: 'Absent'
                        });
                    }
                }

                // Add to Overview Sheet
                const totalProdSeconds = totalWorkSeconds - totalPauseSeconds;
                overviewSheet.addRow({
                    name: user.name,
                    role: user.role,
                    daysPresent: daysPresent,
                    daysAbsent: workingDays - daysPresent,
                    workHours: formatDuration(totalWorkSeconds),
                    prodHours: formatDuration(totalProdSeconds),
                    pauseHours: formatDuration(totalPauseSeconds),
                    overtime: formatDuration(totalOvertimeSeconds)
                });
            }

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=Export_GRH_${format(new Date(), 'yyyyMMdd')}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();
        } else {
            res.status(400).json({ message: 'Unsupported format' });
        }

    } catch (error) {
        console.error('Error generating GRH export:', error);
        res.status(500).json({ message: 'Error generating export' });
    }
};

function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}
