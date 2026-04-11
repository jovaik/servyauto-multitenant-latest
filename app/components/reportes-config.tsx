'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Mail, Save, CheckCircle, AlertCircle, Clock, Calendar, BarChart3, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReportesConfigData {
  emailDestinatarios: string;
  reporteDiarioActivo: boolean;
  reporteSemanalActivo: boolean;
  reporteMensualActivo: boolean;
  reporteAnualActivo: boolean;
}

export function ReportesConfig() {
  const { toast } = useToast();
  const [config, setConfig] = useState<ReportesConfigData>({
    emailDestinatarios: 'info@servyauto.com',
    reporteDiarioActivo: true,
    reporteSemanalActivo: true,
    reporteMensualActivo: true,
    reporteAnualActivo: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/configuracion/reportes');
      if (res.ok) {
        const data = await res.json();
        setConfig({
          emailDestinatarios: data.emailDestinatarios || 'info@servyauto.com',
          reporteDiarioActivo: data.reporteDiarioActivo ?? true,
          reporteSemanalActivo: data.reporteSemanalActivo ?? true,
          reporteMensualActivo: data.reporteMensualActivo ?? true,
          reporteAnualActivo: data.reporteAnualActivo ?? true,
        });
      }
    } catch (error) {
      console.error('Error cargando config reportes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validar emails
    const emails = config.emailDestinatarios.split(',').map(e => e.trim()).filter(Boolean);
    if (emails.length === 0) {
      toast({ title: 'Error', description: 'Debes indicar al menos un email', variant: 'destructive' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(e => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      toast({ title: 'Error', description: `Email(s) inv\u00e1lido(s): ${invalidEmails.join(', ')}`, variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/configuracion/reportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        toast({ title: '\u2705 Guardado', description: 'Configuraci\u00f3n de reportes actualizada' });
      } else {
        throw new Error('Error al guardar');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo guardar la configuraci\u00f3n', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          Cargando configuraci\u00f3n de reportes...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Mail className="mr-2 h-5 w-5" />
          Reportes Autom\u00e1ticos por Email
        </CardTitle>
        <CardDescription>
          Configura los reportes autom\u00e1ticos que se env\u00edan peri\u00f3dicamente con res\u00famenes de actividad.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Destinatarios */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Destinatarios</Label>
          <p className="text-sm text-gray-500">Emails a los que se env\u00edan los reportes. Separa m\u00faltiples emails con comas.</p>
          <Input
            value={config.emailDestinatarios}
            onChange={(e) => setConfig({ ...config, emailDestinatarios: e.target.value })}
            placeholder="email1@ejemplo.com, email2@ejemplo.com"
          />
        </div>

        {/* Reportes activos */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Reportes Activos</Label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Diario */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-100 text-blue-700">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Reporte Diario</p>
                  <p className="text-xs text-gray-500">Todos los d\u00edas a las 23:00</p>
                </div>
              </div>
              <Switch
                checked={config.reporteDiarioActivo}
                onCheckedChange={(checked) => setConfig({ ...config, reporteDiarioActivo: checked })}
              />
            </div>

            {/* Semanal */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-green-100 text-green-700">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Reporte Semanal</p>
                  <p className="text-xs text-gray-500">Lunes a las 08:00</p>
                </div>
              </div>
              <Switch
                checked={config.reporteSemanalActivo}
                onCheckedChange={(checked) => setConfig({ ...config, reporteSemanalActivo: checked })}
              />
            </div>

            {/* Mensual */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-purple-100 text-purple-700">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Reporte Mensual</p>
                  <p className="text-xs text-gray-500">D\u00eda 1 de cada mes a las 08:00</p>
                </div>
              </div>
              <Switch
                checked={config.reporteMensualActivo}
                onCheckedChange={(checked) => setConfig({ ...config, reporteMensualActivo: checked })}
              />
            </div>

            {/* Anual */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-amber-100 text-amber-700">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Reporte Anual</p>
                  <p className="text-xs text-gray-500">1 de Enero a las 10:00</p>
                </div>
              </div>
              <Switch
                checked={config.reporteAnualActivo}
                onCheckedChange={(checked) => setConfig({ ...config, reporteAnualActivo: checked })}
              />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Informaci\u00f3n sobre los reportes</p>
              <ul className="space-y-1 list-disc list-inside text-blue-700">
                <li>Los reportes se env\u00edan autom\u00e1ticamente a todos los emails configurados</li>
                <li>Incluyen desglose por local: citas, ingresos, gastos y m\u00e9tricas clave</li>
                <li>La hora es en zona horaria de Espa\u00f1a (Europe/Madrid)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bot\u00f3n guardar */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar Configuraci\u00f3n de Reportes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
