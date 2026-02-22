import { compilePattern } from '@piqit/resolvers'

const pattern = compilePattern('TASK-{num:\\d+}-{slug}.md')

console.log(pattern.match('TASK-003-reject-blank-titles-in-create-command.md'))
// {
//   num: '003',
//   slug: 'reject-blank-titles-in-create-command'
// }

console.log(pattern.match('TASK-abc-reject-blank-titles-in-create-command.md'))
// null
