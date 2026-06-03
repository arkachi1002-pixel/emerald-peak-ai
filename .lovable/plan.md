## Проблема

`src/routes/workout.$id.session.tsx` по правилам TanStack Router — дочерний маршрут для `src/routes/workout.$id.tsx`. Родитель должен рендерить `<Outlet />`, чтобы показать дочернюю страницу. Сейчас он этого не делает, поэтому при переходе на `/workout/$id/session` URL меняется, но визуально остаётся страница деталей.

## Решение

Разделить родителя и индексную страницу деталей:

1. **Создать `src/routes/workout.$id.index.tsx`** — перенести туда весь текущий контент `WorkoutDetail` (превью, кнопка «Start guided session»). Путь: `/workout/$id`.

2. **Заменить `src/routes/workout.$id.tsx`** на тонкий layout-маршрут, который рендерит только `<Outlet />`:
   ```tsx
   export const Route = createFileRoute("/workout/$id")({
     component: () => <Outlet />,
   });
   ```

3. **`src/routes/workout.$id.session.tsx`** — без изменений, продолжит работать как дочерний маршрут.

4. Роут-дерево `src/routeTree.gen.ts` перегенерится автоматически плагином Vite.

После этого:
- `/workout/$id` → рендерит index с превью и кнопкой Start.
- `/workout/$id/session` → рендерит полноэкранный гайд по упражнениям.