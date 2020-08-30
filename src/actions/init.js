const path = require('path')
const fs = require('fs')
const Inquirer = require('inquirer') // 创建命令行式的交互终端
const del = require('del')
const axios = require('axios')
const { promisify } = require('util')
const downloadGitRepo = promisify(require('download-git-repo'))
const ncp = promisify(require('ncp'))
const shelljs = require('shelljs') // 执行 npm i 命令
const ora = require('ora')

const baseUrl = 'https://api.github.com'

// 创建项目目录
const existDir = async (projectName) => {
  const dir = path.resolve('.') // 解析到当前的目录
  const createDir = dir + '/' + projectName // 拼接路径
  if (fs.existsSync(createDir)) { // 判断需要创建的目录是否存在
    const result = await Inquirer.prompt({ // 提示用户是否覆盖
      name: 'create dir',
      type: 'confirm',
      message: 'Overwrite your existed Directory?',
      default: true // 默认值 直接回车
    })

    if (result['create dir']) { // true
      await del(createDir, { force: true }) // 强制删除
      fs.mkdirSync(createDir)
      return createDir
    } else { // false
      console.log('取消了创建目录，停止创建项目：')
      process.exit(1)
    }
  }
  // 目录不存在 直接创建目录
  fs.mkdirSync(createDir)
  return createDir
}

// 获取 repo name
const fetchRepoList = async () => {
  // https://api.github.com/users/vuejs-templates/repos
  const { data } = await axios.get(baseUrl + '/users/vuejs-templates/repos') // vuejs-templates 亦可定义成一个变量读取
  // 提取与webpack字段相关的名称，过滤不相干的项目
  const repoName = data
    .map(item => item.name)
    .filter(item => /webpack/.test(item))
  return repoName
}

// 获取特定的tags 需传递参数repo name，比如 webpack
const fetchRepoTags = async (repo) => {
  const { data } = await axios.get(baseUrl + `/repos/vuejs-templates/${repo}/tags`)
  const tagName = data.map(item => item.name)
  return tagName
}

// 对下载做优化 第一个参数是函数，第二个参数是函数执行时的输出提示
const waitLoading = (fn, message) => async (...args) => {
  const spinner = ora(message)
  spinner.start()
  const result = await fn(...args)
  spinner.succeed()
  return result
}

module.exports = async (projectName) => {
  // 1. 创建项目目录，如果目录存在，则提示用户是否覆盖
  const dest = await existDir(projectName)
  console.log('dest', dest)
  
  // 2. 拉取 github template，选择指定的 tag 与仓库，https://github.com/vuejs-templates
  // 使用 github developer 的接口(https://developer.github.com/v3/repos/)：list repositories for a user、list repositories tags
  // 仓库 =》标签 =》特定版本仓库
  // 仓库 =》分支 =》特定版本仓库
  // 基础路径：https://api.github.com
  const repoName = await waitLoading(fetchRepoList, '获取远程仓库列表')()
  const { repo } = await Inquirer.prompt({
    name: 'repo',
    type: 'list',
    message: 'Choose the repo needs to download!',
    choices: repoName
  })

  const tags = await waitLoading(fetchRepoTags, '获取远程仓库标签')(repo)
  const { tag } = await Inquirer.prompt({
    name: 'tag',
    type: 'list',
    message: 'Choose the tag needs to download!',
    choices: tags
  })
  // const tagName = await fetchRepoTags('vue-template')
  // console.log('tagName', tagName)
  
  // 3. 下载并安装依赖
  let repoUrl = `vuejs-templates/${repo}`
  if (tag) { // 分支存在
    repoUrl = `vuejs-templates/${repo}#${tag}`
  }

  // 会使用git clone 命令下载仓库，可以做一些交互层面的优化，下载的时候转圈圈，或者是加载进度条的交互
  const result = await downloadGitRepo(repoUrl, dest + '/tmp') // 第二个参数时下载存放的路径
  console.log('result', result)

  await ncp(dest + '/tmp', dest)
  await del(dest + '/tmp')

  shelljs.cd(dest)
  shelljs.exec('yarn')
}
