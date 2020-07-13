package room


func resample(pcm []int16, targetSize int, srcSampleRate int, dstSampleRate int) []int16 {
	newPCML := make([]int16, targetSize/2)
	newPCMR := make([]int16, targetSize/2)
	newPCM := make([]int16, targetSize)
	for i := 0; i+1 < len(pcm); i += 2 {
		newPCML[(i/2)*dstSampleRate/srcSampleRate] = pcm[i]
		newPCMR[(i/2)*dstSampleRate/srcSampleRate] = pcm[i+1]
	}
	for i := 1; i < len(newPCML); i++ {
		if newPCML[i] == 0 {
			newPCML[i] = newPCML[i-1]
		}
	}
	for i := 1; i < len(newPCMR); i++ {
		if newPCMR[i] == 0 {
			newPCMR[i] = newPCMR[i-1]
		}
	}
	for i := 0; i+1 < targetSize; i += 2 {
		newPCM[i] = newPCML[i/2]
		newPCM[i+1] = newPCMR[i/2]
	}

	return newPCM
}