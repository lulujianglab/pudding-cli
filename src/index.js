#!/usr/bin/env node
const { program } = require('commander')
const { version } = require('../package.json')
const path = require('path')

program.version(version)

const mapActions = {
  init: {
    alias: 'i',
    desc: 'create/init a project!',
    examples: [
      'pudding init <projectName>',
      'pudding i <projectName>'
    ]
  },
  remove: {
    alias: 'rm',
    desc: 'remove files from path',
    examples: [
      'pudding rm -r <filepath>',
      'pudding rm <file> '
    ]
  },
  '*': { // 参数传递到 mapActions 不存在时，有三个属性
    alias: '',
    desc: 'command not found!', // 描述
    examples: [ // 示例

    ]
  }
}

Object.keys(mapActions).forEach(key => {
  program
    .command(key) // 子命令
    .alias(mapActions[key].alias)
    .description(mapActions[key].desc) // 子命令描述
    .action(() => { // 命令操作
      if (key === '*') {
        console.log(mapActions[key].desc)
      } else { // 非 *
        // 解析到这个文件，并将参数传递过去
        require(path.resolve(__dirname, `./actions/${key}`))(
          ...process.argv.splice(3)
        )
        // console.log(...process.argv.splice(3))
      }
    })
})

program.parse(process.argv)
