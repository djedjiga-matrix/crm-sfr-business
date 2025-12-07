import { calculateContactScore, getScoreCategory, getRecommendedAction } from '../services/scoringService';

describe('Scoring Service', () => {
    describe('calculateContactScore', () => {
        it('should return 0 for empty contact', () => {
            const result = calculateContactScore({ id: '1' });
            expect(result.total).toBe(0);
        });

        it('should add points for company name', () => {
            const result = calculateContactScore({
                id: '1',
                companyName: 'Test Company'
            });
            expect(result.completeness).toBeGreaterThan(0);
        });

        it('should add points for complete contact info', () => {
            const result = calculateContactScore({
                id: '1',
                companyName: 'Test Company',
                email: 'test@test.com',
                phoneFixed: '0123456789',
                siret: '12345678901234'
            });
            expect(result.completeness).toBeGreaterThanOrEqual(14);
        });

        it('should give bonus for favorable status', () => {
            const withCallback = calculateContactScore({
                id: '1',
                companyName: 'Test',
                status: 'CALLBACK_LATER'
            });
            const withNew = calculateContactScore({
                id: '1',
                companyName: 'Test',
                status: 'NEW'
            });
            expect(withCallback.engagement).toBeGreaterThan(withNew.engagement);
        });

        it('should penalize negative statuses', () => {
            const notInterested = calculateContactScore({
                id: '1',
                companyName: 'Test',
                effectif: '100+',
                status: 'NOT_INTERESTED'
            });
            expect(notInterested.timing).toBe(0);
        });

        it('should cap total at 100', () => {
            const maxContact = calculateContactScore({
                id: '1',
                companyName: 'Grande Entreprise Tech',
                email: 'contact@company.com',
                phoneFixed: '0123456789',
                phoneMobile: '0612345678',
                siret: '12345678901234',
                activity: 'Informatique et Tech',
                city: 'Paris',
                postalCode: '75001',
                effectif: '250+',
                status: 'CALLBACK_LATER',
                callCount: 10,
                lastContactDate: new Date()
            });
            expect(maxContact.total).toBeLessThanOrEqual(100);
        });
    });

    describe('getScoreCategory', () => {
        it('should return HOT for score >= 70', () => {
            const result = getScoreCategory(75);
            expect(result.label).toBe('HOT');
            expect(result.priority).toBe('high');
        });

        it('should return WARM for score >= 50', () => {
            const result = getScoreCategory(55);
            expect(result.label).toBe('WARM');
            expect(result.priority).toBe('medium');
        });

        it('should return COOL for score >= 30', () => {
            const result = getScoreCategory(35);
            expect(result.label).toBe('COOL');
            expect(result.priority).toBe('low');
        });

        it('should return COLD for score < 30', () => {
            const result = getScoreCategory(15);
            expect(result.label).toBe('COLD');
            expect(result.priority).toBe('low');
        });
    });

    describe('getRecommendedAction', () => {
        it('should recommend callback for CALLBACK_LATER status', () => {
            const result = getRecommendedAction({ id: '1', status: 'CALLBACK_LATER' });
            expect(result).toContain('Rappeler');
        });

        it('should recommend follow-up for FOLLOW_UP status', () => {
            const result = getRecommendedAction({ id: '1', status: 'FOLLOW_UP' });
            expect(result).toContain('Relancer');
        });

        it('should recommend preparation for APPOINTMENT_TAKEN status', () => {
            const result = getRecommendedAction({ id: '1', status: 'APPOINTMENT_TAKEN' });
            expect(result).toContain('RDV');
        });
    });
});
