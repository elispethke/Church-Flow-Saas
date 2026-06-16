import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { ThemeToggle } from '../shared/components/theme-toggle'
import { Badge } from '../shared/components/ui/badge'
import { Button } from '../shared/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../shared/components/ui/card'
import { Input } from '../shared/components/ui/input'

function DesignSystemPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="border-border bg-card sticky top-0 z-10 border-b px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-foreground text-lg font-semibold">Church Flow</h1>
            <p className="text-muted-foreground text-xs">Design System</p>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
        {/* Colors */}
        <section className="space-y-4">
          <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-widest">
            Tokens
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'background', className: 'bg-background border border-border' },
              { label: 'card', className: 'bg-card border border-border' },
              { label: 'primary', className: 'bg-primary' },
              { label: 'accent', className: 'bg-accent' },
              { label: 'muted', className: 'bg-muted border border-border' },
              { label: 'secondary', className: 'bg-secondary border border-border' },
              { label: 'destructive', className: 'bg-destructive' },
              { label: 'border', className: 'bg-border' },
            ].map(({ label, className }) => (
              <div key={label} className="space-y-1">
                <div className={`h-10 rounded-md ${className}`} />
                <p className="text-muted-foreground text-xs">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Badges */}
        <section className="space-y-4">
          <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-widest">
            Badge
          </h2>
          <div className="flex flex-wrap gap-2">
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="accent">Accent</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </div>
        </section>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-widest">
            Button
          </h2>
          <div className="flex flex-wrap gap-3">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </div>
        </section>

        {/* Input */}
        <section className="space-y-4">
          <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-widest">
            Input
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Email" type="email" />
            <Input placeholder="Disabled" disabled />
          </div>
        </section>

        {/* Card */}
        <section className="space-y-4">
          <h2 className="text-muted-foreground text-sm font-semibold uppercase tracking-widest">
            Card
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Receitas do Mês</CardTitle>
                <CardDescription>Janeiro 2026</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-primary text-2xl font-bold">R$ 48.250,00</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  +12% em relação ao mês anterior
                </p>
              </CardContent>
              <CardFooter className="gap-2">
                <Badge variant="accent">Ativo</Badge>
                <Badge variant="outline">Aprovado</Badge>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Departamentos</CardTitle>
                <CardDescription>Ativos na Igreja Demo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="border-border flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm">Louvor</span>
                  <Badge variant="secondary">12 membros</Badge>
                </div>
                <div className="border-border flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm">Infantil</span>
                  <Badge variant="secondary">8 membros</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" className="w-full">
                  Ver todos
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>
      </main>
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <DesignSystemPage />,
  },
])

export function Router() {
  return <RouterProvider router={router} />
}
