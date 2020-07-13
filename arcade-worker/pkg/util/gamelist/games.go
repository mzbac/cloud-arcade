package gamelist

import (
	"strings"
	"path/filepath"
)

type GameInfo struct {
	Name string
	Path string
	Type string
}



func GetGameInfo(path string) GameInfo {
	fileName := filepath.Base(path)
	ext := filepath.Ext(fileName)
	return GameInfo{
		Name: strings.TrimSuffix(fileName, ext),
		Type: ext[1:],
		Path: path,
	}
}
